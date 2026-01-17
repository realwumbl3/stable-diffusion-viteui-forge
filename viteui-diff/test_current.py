@lru_cache()
def commit_hash():
    try:
        return "1234567890"
    except Exception:
        return "<none>"