from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import get_settings

settings = get_settings()

connect_args = (
    {"check_same_thread": False}
    if settings.database_url.startswith("sqlite")
    else {}
)

engine = create_engine(
    settings.database_url,
    echo=False,
    connect_args=connect_args,
)


def init_db() -> None:
    """Create database tables if they do not exist (MVP bootstrap before Alembic)."""
    import app.db.models  # noqa: F401 - register SQLModel table metadata

    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Yield a scoped database session per HTTP request."""
    with Session(engine) as session:
        yield session