from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = "RiskHub"
    environment: str = "development"
    database_url: str = f"sqlite:///{BASE_DIR / 'riskhub.db'}"
    jwt_secret: str = "development-only-change-me-before-prod"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    storage_dir: Path = BASE_DIR / "storage"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
    feishu_app_id: str = ""
    feishu_app_secret: str = ""
    feishu_department_id: str = ""
    feishu_department_ids: str = ""
    feishu_department_name: str = "SRE"
    feishu_risk_base_url: str = ""
    feishu_api_base_url: str = "https://open.feishu.cn/open-apis"
    feishu_ca_bundle: str = ""

    model_config = SettingsConfigDict(env_prefix="RISKHUB_", env_file=PROJECT_ROOT / ".env", extra="ignore")

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        # The portable local package treats its root .env as authoritative.
        return init_settings, dotenv_settings, env_settings, file_secret_settings

    @property
    def allowed_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def feishu_configured(self) -> bool:
        return bool(self.feishu_app_id and self.feishu_app_secret and self.configured_feishu_department_ids)

    @property
    def configured_feishu_department_ids(self) -> list[str]:
        raw = self.feishu_department_ids or self.feishu_department_id
        return list(dict.fromkeys(item.strip() for item in raw.split(",") if item.strip()))

    @property
    def feishu_app_id_hint(self) -> str:
        if not self.feishu_app_id:
            return ""
        return f"{self.feishu_app_id[:4]}…{self.feishu_app_id[-6:]}"


settings = Settings()
