***

### __Start project__
```
npx cdk init app --language=typescript
```
### __How to bootstrap your project__

```
npx cdk bootstrap --profile ivan-arteaga-dev
```

### __Deploy project__
```
npx cdk deploy --profile ivan-arteaga-dev
```


#### OneTable is a tool for managing DynamoDB queries
```
npm i @aws-sdk/client-dynamodb dynamodb-onetable
npm i -D esbuild
npm i @aws-cdk/aws-apigatewayv2-alpha @aws-cdk/aws-apigatewayv2-integrations-alpha
npm i react react-dom
npm i -D @types/react @types/react-dom @vitejs/plugin-react-refresh vite
```

### __How to destroy the project__
```
npx cdk destroy --profile ivan-arteaga-dev
```

### __How to test the app__
```
npx vite
```

---

# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
