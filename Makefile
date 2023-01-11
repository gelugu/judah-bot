version=$(shell cat package.json | jq -r .version)
container_name=$(shell cat package.json | jq -r .name | tr -d '@'):${version}

prepare:
	npm i

docker-build:
	docker build -t ${container_name} .
docker-start:
	docker run --env-file .env ${container_name}
docker-check: docker-build docker-start
docker-push:
	docker push ${container_name}

encrypt:
	ansible-vault encrypt --vault-password-file .vault.pass secrets.yml
decrypt:
	ansible-vault decrypt --vault-password-file .vault.pass secrets.yml

update-secrets:
	kubectl apply -f secrets.yml
update-deployment:
	kubectl apply -f k8s.yaml
restart-deployment:
	kubectl rollout restart deployment/black-feb-bot

deploy: docker-build docker-push decrypt update-secrets encrypt update-deployment restart-deployment