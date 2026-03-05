# AI Music Generation Web Application

> A production-minded Django foundation for building the next wave of AI-powered music creation.

![Django](https://img.shields.io/badge/Django-4.2.x-0C4B33?style=for-the-badge&logo=django)
![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Status](https://img.shields.io/badge/Status-Foundation%20Stage-ffb300?style=for-the-badge)

## Project Vision

This project is the backend core of an **AI Music Generation Platform** designed to evolve into a complete web product where users can:

- Generate music from prompts or style presets
- Manage generated tracks in personal workspaces
- Preview, iterate, and export results
- Collaborate and share creations online

Current repository state is an initial Django scaffold, prepared for structured expansion.

## Quick Start

### 1) Create virtual environment

```bash
python -m venv .venv
source .venv/bin/activate
```

### 2) Install dependencies

```bash
pip install -r requirements.txt
```

### 3) Run database migrations

```bash
python manage.py migrate
```

### 4) Create admin account (optional)

```bash
python manage.py createsuperuser
```

### 5) Start development server

```bash
python manage.py runserver
```

Open:

- `http://127.0.0.1:8000/admin/`

## Development Workflow

```bash
# activate environment
source .venv/bin/activate

# run migrations after model changes
python manage.py makemigrations
python manage.py migrate

# run local server
python manage.py runserver
```

## License

This project is licensed under the MIT License.  
See [LICENSE](LICENSE) for details.
