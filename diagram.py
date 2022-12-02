from diagrams import Diagram
from diagrams.aws.devtools import Codepipeline
from diagrams.aws.devtools import Codebuild
from diagrams.aws.devtools import Codedeploy
from diagrams.aws.storage import S3
from diagrams.onprem.vcs import Github

graph_attr = {
    "bgcolor": "transparent"
}

with Diagram("", direction="LR", graph_attr=graph_attr):
    Github("Repository") >> Codepipeline("CodePipeline") >> Codebuild("CodeBuild") >> Codedeploy("CodeDeploy") >> S3("Static Website")
       
        

    