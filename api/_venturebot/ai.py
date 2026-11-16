import json
import math
import os
import re
import urllib.error
import urllib.request

from .prompts import (
    CHAT_MODES,
    CHAT_SYSTEM,
    GRADER_CATEGORIES,
    GRADER_QUESTIONS,
    GRADER_SCHEMA,
    PERCENTILE_MEAN,
    PERCENTILE_SD,
    grader_system,
    grader_user_message,
)

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
TIMEOUT = 60
MAX_CHAT_MESSAGES = 20
MAX_CHAT_CHARS = 2000
MAX_ANSWER_CHARS = 1500


class OpenAIError(Exception):
    pass


def _short_error(message, api_key):
    message = str(message or "OpenAI request failed.")
    if api_key:
        message = message.replace(api_key, "[redacted]")
    message = re.sub(r"\s+", " ", message).strip()
    return message[:240] or "OpenAI request failed."


def _openai_completion(api_key, model, temperature, max_tokens, messages, response_format=None):
    payload = {
        "model": model,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    if response_format is not None:
        payload["response_format"] = response_format
    request = urllib.request.Request(
        OPENAI_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": "Bearer " + api_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        try:
            error_body = json.loads(exc.read(65536).decode("utf-8"))
            error_message = error_body.get("error", {}).get("message")
        except (ValueError, AttributeError, TypeError):
            error_message = None
        raise OpenAIError(_short_error(error_message or f"OpenAI returned HTTP {exc.code}.", api_key))
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        reason = getattr(exc, "reason", None) or exc
        raise OpenAIError(_short_error(reason, api_key))
    except (ValueError, UnicodeDecodeError):
        raise OpenAIError("OpenAI returned an invalid response.")

    try:
        content = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise OpenAIError("OpenAI returned an invalid response.")
    if not isinstance(content, str):
        raise OpenAIError("OpenAI returned an empty response.")
    return content


def chat(body):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return 503, {"error": "Venture.bot AI is not configured"}
    if not isinstance(body, dict) or not isinstance(body.get("messages"), list):
        return 400, {"error": "Invalid chat payload."}

    messages = []
    for item in body["messages"]:
        if not isinstance(item, dict) or item.get("role") not in ("user", "assistant"):
            return 400, {"error": "Messages must have a user or assistant role."}
        content = item.get("content")
        if not isinstance(content, str):
            return 400, {"error": "Message content must be text."}
        content = content.strip()
        if content:
            messages.append({"role": item["role"], "content": content[:MAX_CHAT_CHARS]})
    messages = messages[-MAX_CHAT_MESSAGES:]
    if not messages or messages[-1]["role"] != "user":
        return 400, {"error": "The last message must be from the user."}

    mode = body.get("mode")
    system = CHAT_SYSTEM
    if isinstance(mode, str) and mode in CHAT_MODES:
        system += "\n\n" + CHAT_MODES[mode]
    request_messages = [{"role": "system", "content": system}] + messages
    try:
        reply = _openai_completion(
            api_key,
            os.environ.get("VENTUREBOT_CHAT_MODEL", "gpt-4.1-mini"),
            0.7,
            600,
            request_messages,
        )
    except OpenAIError as exc:
        return 502, {"error": _short_error(exc, api_key)}
    return 200, {"reply": reply}


def _find_case_insensitive_substring(needle, haystack):
    folded = []
    source_ranges = []
    for index, char in enumerate(haystack):
        value = char.casefold()
        folded.append(value)
        source_ranges.extend([(index, index + 1)] * len(value))
    folded_haystack = "".join(folded)
    start = folded_haystack.find(needle.casefold())
    if start < 0 or not needle:
        return None
    end = start + len(needle.casefold())
    return haystack[source_ranges[start][0]:source_ranges[end - 1][1]]


def _string_list(value, limit):
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str)][:limit]


def grade(body):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return 503, {"error": "Venture.bot AI is not configured"}
    if not isinstance(body, dict) or not isinstance(body.get("answers"), dict):
        return 400, {"error": "Invalid grading payload."}

    known_ids = {question["id"] for question in GRADER_QUESTIONS}
    answers = {}
    for question_id, answer in body["answers"].items():
        if question_id not in known_ids:
            continue
        if not isinstance(answer, str):
            return 400, {"error": "Answers must be text."}
        answers[question_id] = answer[:MAX_ANSWER_CHARS].strip()
    if sum(bool(answer) for answer in answers.values()) < 3:
        return 400, {"error": "Answer at least 3 questions to get a grade."}

    try:
        content = _openai_completion(
            api_key,
            os.environ.get("VENTUREBOT_GRADE_MODEL", "gpt-4.1"),
            0.3,
            3000,
            [
                {"role": "system", "content": grader_system()},
                {"role": "user", "content": grader_user_message(answers)},
            ],
            {"type": "json_schema", "json_schema": GRADER_SCHEMA},
        )
        result = json.loads(content)
    except OpenAIError as exc:
        return 502, {"error": _short_error(exc, api_key)}
    except (ValueError, TypeError):
        return 502, {"error": "OpenAI returned an invalid grading response."}

    categories_by_key = {}
    raw_categories = result.get("categories") if isinstance(result, dict) else None
    if not isinstance(raw_categories, list):
        return 502, {"error": "OpenAI returned an invalid grading response."}
    for category in raw_categories:
        if not isinstance(category, dict):
            continue
        key = category.get("key")
        score = category.get("score")
        comment = category.get("comment")
        if not isinstance(key, str) or key not in {item["key"] for item in GRADER_CATEGORIES}:
            continue
        if isinstance(score, bool) or not isinstance(score, int) or not isinstance(comment, str):
            continue
        categories_by_key[key] = {
            "key": key,
            "name": next(item["name"] for item in GRADER_CATEGORIES if item["key"] == key),
            "score": max(1, min(10, score)),
            "comment": comment,
        }
    if any(category["key"] not in categories_by_key for category in GRADER_CATEGORIES):
        return 502, {"error": "OpenAI did not return all grading categories."}
    categories = [categories_by_key[item["key"]] for item in GRADER_CATEGORIES]
    overall = round(sum(item["score"] for item in categories) / len(categories), 1)
    z_score = (overall - PERCENTILE_MEAN) / PERCENTILE_SD
    percentile = round(100 * (0.5 * (1 + math.erf(z_score / math.sqrt(2)))))
    percentile = max(1, min(99, percentile))

    highlights = []
    raw_highlights = result.get("highlights", [])
    if isinstance(raw_highlights, list):
        for item in raw_highlights:
            if len(highlights) >= 5:
                break
            if not isinstance(item, dict):
                continue
            question_id = item.get("question_id")
            quote = item.get("quote")
            kind = item.get("type")
            comment = item.get("comment")
            if (
                not isinstance(question_id, str)
                or question_id not in known_ids
                or not isinstance(quote, str)
                or not isinstance(comment, str)
                or kind not in ("strength", "weakness")
            ):
                continue
            exact_quote = _find_case_insensitive_substring(quote, answers.get(question_id, ""))
            if exact_quote is not None:
                highlights.append({
                    "question_id": question_id,
                    "quote": exact_quote,
                    "type": kind,
                    "comment": comment,
                })

    return 200, {
        "overall": overall,
        "percentile": percentile,
        "categories": categories,
        "highlights": highlights,
        "overall_feedback": result.get("overall_feedback", "") if isinstance(result.get("overall_feedback", ""), str) else "",
        "brutally_honest": result.get("brutally_honest", "") if isinstance(result.get("brutally_honest", ""), str) else "",
        "strengths": _string_list(result.get("strengths"), 3),
        "suggestions": _string_list(result.get("suggestions"), 5),
    }
