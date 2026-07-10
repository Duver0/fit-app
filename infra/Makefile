.PHONY: up down restart logs ps pull migrate seed health backup

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

ps:
	docker compose ps

pull:
	docker compose pull

migrate:
	docker compose exec api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

seed:
	docker compose exec api npx prisma db seed --schema=apps/api/prisma/schema.prisma

health:
	curl -s http://localhost/health | jq .

backup:
	docker compose exec postgres pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup_$$(date +%Y%m%d_%H%M%S).sql
