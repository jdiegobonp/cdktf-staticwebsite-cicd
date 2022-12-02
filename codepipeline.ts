import { Construct } from "constructs";
import { S3Bucket } from "./.gen/providers/aws/s3-bucket";
import { IamRole } from "./.gen/providers/aws/iam-role";
import { IamRolePolicy } from "./.gen/providers/aws/iam-role-policy"
import { Codepipeline } from './.gen/providers/aws/codepipeline';
import { CodebuildProject } from './.gen/providers/aws/codebuild-project'


export class CodePipeline extends Construct {

    public artifactStore: S3Bucket;
    public role: IamRole;
    public roleBuild: IamRole;
    public pipeline: Codepipeline;
    public codebuildproject: CodebuildProject;

    constructor(
        scope: Construct,
        id: string, 
        staticwebsiteBucket: string,
        githubParams: Map<string, string>
    ) {
        
        super(scope, id);

        // S3 Bucket to store CodePipeline artifacts
        this.artifactStore = new S3Bucket(this, "s3_artifacts_store", {
            bucket: "s3-staticwebsite-artifcats-store",
            forceDestroy: true,
            tags: {
              Environment: 'Development',
            },
        });

        // S3 Bucket to store CodeBuild artifacts
        this.artifactStore = new S3Bucket(this, "s3_artifacts_build", {
            bucket: "s3-staticwebsite-artifacts-build",
            forceDestroy: true,
            tags: {
              Environment: 'Development',
            },
        });

        // IAM Role to Codepipeline
        this.role = new IamRole(this, 'staticwebsite-codepipeline-iam-role', {
			name: "iam_role_codepipeline_jd",
			assumeRolePolicy: `{
	            "Version": "2012-10-17",
	            "Statement": [
	                {
	                    "Effect": "Allow",
	                    "Principal": {
	                        "Service": "codepipeline.amazonaws.com"
	                    },
	                    "Action": "sts:AssumeRole"
	                }
	            ]
	        }`,
		});

        // IAM Role to CodeBuild
        this.roleBuild = new IamRole(this, 'staticwebsite-codebuild-iam-role', {
			name: "iam_role_codebuild_jd",
			assumeRolePolicy: `{
	            "Version": "2012-10-17",
	            "Statement": [
	                {
	                    "Effect": "Allow",
	                    "Principal": {
	                        "Service": "codebuild.amazonaws.com"
	                    },
	                    "Action": "sts:AssumeRole"
	                }
	            ]
	        }`,
		});

         // IAM Role Policy to Codepipeline
        new IamRolePolicy(this, 'staticwebsite-codepipeline-iam-policy', {
            role: this.role.name,
            policy: `{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "codedeploy:GetDeploymentConfig"
                    ],
                    "Resource": [
                        "*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "s3:*",
                        "logs:*",
                        "codebuild:*"
                    ],
                    "Resource": [
                        "*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": "iam:PassRole",
                    "Resource": "*"
                }
            ]
        }`,
        });

        // IAM Role Policy to CodeBuild
        new IamRolePolicy(this, 'staticwebsite-codebuild-iam-policy', {
            role: this.roleBuild.name,
            policy: `{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "codedeploy:GetDeploymentConfig"
                    ],
                    "Resource": [
                        "*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "s3:*",
                        "logs:*"
                    ],
                    "Resource": [
                        "*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": "iam:PassRole",
                    "Resource": "*"
                }
            ]
        }`,
        });

        // CodeBuild Project
        this.codebuildproject = new CodebuildProject(this, "staticwebsite-build", {
            name: "codebuild_staticwebsite_jd",
            serviceRole: this.roleBuild.arn,
            source:{
                type: "CODEPIPELINE"
            },
            artifacts:{
                type: "CODEPIPELINE"
            },
            environment:{
                computeType: "BUILD_GENERAL1_SMALL",
                image: "aws/codebuild/standard:6.0",
                type: "LINUX_CONTAINER",
                privilegedMode: true
            }
        });

        // Codepipeline
        this.pipeline = new Codepipeline(this, 'staticwebsite-pipeline', {
			name: "codepipeline_staticwebsite_jd",
			roleArn: this.role.arn,
            dependsOn: [this.artifactStore, this.codebuildproject],
			artifactStore: [
				{
					type: 'S3',
					location: this.artifactStore.bucket,
				},
			],
			stage: [
				{
					name: 'Source',
					action: [

						{
							name: 'Source',
							category: 'Source',
							owner: 'ThirdParty',
							provider: 'GitHub',
							outputArtifacts: ['source_output'],
                            version: '1',
							configuration: {
								Repo: githubParams.get("repository")+"",
								Branch: githubParams.get("branch")+"",
                                Owner: githubParams.get("owner")+"",
                                OAuthToken: githubParams.get("personalToken")+""
							},
							runOrder: 1,
						},
					],
				},
                {
                    name: "Build",
                    action: [
                        {
                            name: "Build",
                            category: "Build",
                            owner: "AWS",
                            provider: "CodeBuild",
                            inputArtifacts: ["source_output"],
                            outputArtifacts: ["build_output"],
                            version: "1",
                            configuration:{
                                ProjectName: "codebuild_staticwebsite_jd"
                            }
                        }
                    ]
                },
                {
                    name: "Deploy",
                    action: [
                        {
                            name: "Deploy",
                            category: "Deploy",
                            owner: "AWS",
                            provider: "S3",
                            inputArtifacts: ["build_output"],
                            version: "1",
                            configuration: {
                                BucketName: staticwebsiteBucket,
                                Extract: "true"
                            },
                        },
                    ]
                }
			],
		});

        
    }
}