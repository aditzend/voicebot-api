git add . && \
git commit -m $1 && \
git push origin $2 && \
docker build -t alexanderditzend:voicebot-api:1.0.2 . && \
docker push alexanderditzend:voicebot-api:1.0.2 && \
echo "Docker image pushed to Docker Hub"