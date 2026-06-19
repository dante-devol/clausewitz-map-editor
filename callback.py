import re

if commit.author_email == b"calphff@gmail.com" or commit.author_name == b"Calph":
    commit.author_name = b"Dante Devol"
    commit.author_email = b"dante.devol@gmail.com"

if commit.committer_email == b"calphff@gmail.com" or commit.committer_name == b"Calph":
    commit.committer_name = b"Dante Devol"
    commit.committer_email = b"dante.devol@gmail.com"

commit.message = re.sub(rb"(?im)^co-authored-by:.*$\n?", b"", commit.message)