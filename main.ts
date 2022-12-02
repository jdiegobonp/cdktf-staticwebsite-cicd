import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { AwsProvider } from "./.gen/providers/aws/provider"
import { CodePipeline } from "./codepipeline"

class MyStack extends TerraformStack {

  constructor(scope: Construct, name: string) {
    super(scope, name);

    new AwsProvider(this, "AWS", {
      region: "us-east-1",
      profile: "CDKTF" // Profile
    });

    // Bucket name of the static website
    const bucketName = "staticwebsite-todolist-poc-100021"

    // GitHub Params where the static website repository is
    // Fill out the values
    let gitHubParams = new Map<string, string>([
        ["personalToken", ""],
        ["repository", ""],
        ["branch", ""],
        ["owner", ""]
    ]);

    // Instance the CodePipeline module
    new CodePipeline(this,
        "codepipeline-staticwebsite-todolist",
        bucketName,
        gitHubParams
    );
 
    // define resources here
  }
}

const app = new App();
new MyStack(app, "cdktf-staticwebsite-cicd");
app.synth();
