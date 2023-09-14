---

# __Deploy Node.js Lambda functions with container images__

### __Build the Docker image__
```
docker build --platform linux/amd64 -t docker-image:test .
or
docker build --platform linux/arm64 -t docker-image:test .
```
### __adding dependencies__
```
npm install -D @types/aws-lambda esbuild
```

### __adding config to package.json__
```
  "scripts": {
  "build": "esbuild index.ts --bundle --minify --sourcemap --platform=node --target=es2020 --outfile=dist/index.js"
}
```


### __Test the image locally__
```
docker run -p 9000:8080 docker-image:test
```

```
curl "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{}'
```
---
