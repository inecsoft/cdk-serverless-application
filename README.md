---

### __Start project__
```
npx cdk init app --language=typescript
```

### __ How to bootstrap your project__
npx cdk bootstrap --profile ivan-arteaga-dev

### __Deploy project__
```
npx cdk deploy --profile ivan-arteaga-dev
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
