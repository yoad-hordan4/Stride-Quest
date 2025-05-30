from setuptools import setup, find_packages

setup(
    name="stride-quest",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "geopy",
        "folium",
        "fastapi",
        "uvicorn",
        "pydantic",
    ],
    entry_points={
        "console_scripts": [
            "yoad=yoad_trip.api.main:main"
        ]
    },
)
