"""Gemini chat factory (emergentintegrations). Returns None when GEMINI_API_KEY is not set."""

import os

from emergentintegrations.llm.chat import LlmChat

GEMINI_MODEL = ("gemini", "gemini-3-flash-preview")


def gemini_chat(session_id: str, system_message: str) -> LlmChat | None:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    return LlmChat(api_key=api_key, session_id=session_id, system_message=system_message).with_model(*GEMINI_MODEL)
