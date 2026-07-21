from .base import Connector, ConnectorRow, ConnectorError
from .csv_bundle import CsvBundleConnector
from .sql_query import SqlQueryConnector


def get_connector(kind: str, config: dict, files: list | None = None) -> Connector:
    if kind == "csv_bundle":
        return CsvBundleConnector(config, files or [])
    if kind == "sql_query":
        return SqlQueryConnector(config)
    raise ConnectorError(f"unknown connector kind: {kind}")


__all__ = [
    "Connector",
    "ConnectorRow",
    "ConnectorError",
    "CsvBundleConnector",
    "SqlQueryConnector",
    "get_connector",
]
