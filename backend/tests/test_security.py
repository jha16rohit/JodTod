"""
Tests for backend.core.security.
"""

import pytest

from backend.core.security import (
    generate_otp,
    generate_secure_token,
    generate_session_token,
    hash_password,
    hash_token,
    verify_password,
    verify_token,
)


def test_hash_password_and_verify():
    password = "correct horse battery staple"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong password", hashed) is False


def test_verify_password_rejects_empty_values():
    hashed = hash_password("anything")
    assert verify_password("", hashed) is False
    assert verify_password("any", "") is False


def test_hash_password_rejects_empty():
    with pytest.raises(ValueError):
        hash_password("")


def test_hash_token_roundtrip():
    raw = "some-secret-token"
    digest = hash_token(raw)
    assert verify_token(raw, digest) is True
    assert verify_token("other", digest) is False
    assert verify_token("", digest) is False


def test_generate_secure_token_length_and_policy():
    token = generate_secure_token()
    assert len(token) >= 32

    with pytest.raises(ValueError):
        generate_secure_token(4)


def test_generate_otp_is_numeric_and_in_range():
    for length in (4, 6, 8):
        otp = generate_otp(length)
        assert otp.isdigit()
        assert 10 ** (length - 1) <= int(otp) <= (10**length) - 1


def test_generate_otp_rejects_bad_length():
    with pytest.raises(ValueError):
        generate_otp(11)
    with pytest.raises(ValueError):
        generate_otp(2)


def test_generate_session_token_is_nonempty():
    assert generate_session_token()