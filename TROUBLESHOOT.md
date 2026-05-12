# Troubleshooting EternalNotes

## Models never finish downloading

**Symptom:** `docker compose logs init-models` shows no progress or stalls.

**Fix:** The `init-models` container connects to the `ollama` service on the Docker network. If the Ollama container restarted, the init container may have exited early. Re-run it:

```bash
docker compose up init-models
```

Pull each model manually if needed:

```bash
docker compose exec ollama ollama pull nomic-embed-text
docker compose exec ollama ollama pull llama3.2:3b
docker compose exec ollama ollama pull moondream
```

---

## "Ollama not reachable" in the app

**Symptom:** Ask / Index returns an error. `/api/health` returns `{"ready":false}`.

**Check connectivity:**

```bash
docker compose exec app curl -sf http://ollama:11434/api/tags
```

If this fails, the `ollama` container may not be running:

```bash
docker compose ps
docker compose up -d ollama
```

If Ollama is running but the app still can't reach it, ensure both services are on the same Docker network (they are by default with `docker compose`).

---

## Port 3000 or 11434 already in use

**Symptom:** `docker compose up` fails with `address already in use`.

**Fix:** Edit `docker-compose.yml` and change the host port:

```yaml
ports:
  - "3001:3000"   # app on port 3001
```

```yaml
ports:
  - "11435:11434"  # ollama on port 11435
```

---

## Out of memory / Ollama OOM killed

**Symptom:** `docker compose logs ollama` shows the container exiting, or model responses stop mid-stream.

`llama3.2:3b` requires ~3 GB RAM. `nomic-embed-text` requires ~300 MB. Allow at least 6 GB for the Ollama container in Docker Desktop → Settings → Resources → Memory.

If you are on a machine with less than 8 GB total RAM, stop other containers and applications while using EternalNotes.

---

## ARM Mac (Apple Silicon) / Raspberry Pi

Ollama runs natively on Apple Silicon — no changes needed. The app container is `linux/arm64` compatible via the `node:20-slim` base image.

For Raspberry Pi (ARM 32-bit), the `llama3.2:3b` model may exceed available RAM. Try a smaller Ollama model and update `OLLAMA_ANSWER_MODEL` in your `.env` if the app exposes that variable, or accept reduced AI quality.

---

## Stalled indexing (spinner never completes)

**Symptom:** Clicking **Index** spins indefinitely.

1. Check the app logs: `docker compose logs app`
2. Confirm the embedding model is loaded: `docker compose exec ollama ollama list`
3. If `nomic-embed-text` is missing, pull it: `docker compose exec ollama ollama pull nomic-embed-text`
4. Restart the app container after models are ready: `docker compose restart app`

---

## Data lost after container restart

Your notes and settings are stored in the `app_data` Docker volume, not inside the container. If data appears lost:

```bash
docker volume ls | grep app_data
```

If the volume exists, it was not deleted. Start the stack again:

```bash
docker compose up -d
```

If you ran `docker compose down -v`, the volume was explicitly deleted. This is the only way to lose data. Always use `docker compose down` (without `-v`) to stop without deleting data.

---

## AUTH_SESSION_SECRET not set error

**Symptom:** The app container exits immediately with an error about a missing environment variable.

The `docker-compose.yml` requires `AUTH_SESSION_SECRET` and `PERSONAL_API_KEY_SECRET` to be set before the container starts. Make sure your `.env` file is present in the project root and both variables are filled in:

```bash
cat .env | grep SECRET
```

Both lines must have values (not empty, not the placeholder text from `.env.example`).

---

## Resetting the database

Stop the stack and remove only the app volume (Ollama models are preserved):

```bash
docker compose down
docker volume rm obsidian-rag-system_app_data
docker compose up -d
```

---

## Checking app health

```bash
curl http://localhost:3000/api/health
```

Expected response when everything is working:

```json
{"ollama_reachable":true,"model_loaded":true,"ready":true}
```

If `model_loaded` is `false`, the `nomic-embed-text` model has not been pulled yet. Run the model download step above.
