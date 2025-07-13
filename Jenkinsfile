pipeline {
  agent {
    kubernetes {
      yamlFile 'k8s/pod-template.yaml'
      defaultContainer 'node'
    }
  }

  environment {
    DOCKER_REGISTRY = "registry.gitlab.com/waruimoojin/mernapp"
    SONARQUBE_URL = "http://192.168.56.51:9000"
    VERSION = "v${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(8)}"
  }

  stages {
    stage('Install & Test Frontend') {
      steps {
        container('node') {
          dir('frontend') {
            sh 'npm ci --no-audit'
            sh 'npm run test:ci'
            sh 'npm run build'
          }
        }
      }
      post {
        always {
          junit 'frontend/test-results.xml'
        }
      }
    }

    stage('Install & Test Backend') {
      steps {
        container('node') {
          dir('backend') {
            sh 'npm ci --no-audit'
            sh 'npm run test:ci'
            sh 'npm run build'
          }
        }
      }
      post {
        always {
          junit 'backend/test-results.xml'
        }
      }
    }

    stage('Analyse SonarQube') {
      steps {
        container('sonar-scanner') {
          withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
            sh """
              sonar-scanner \
                -Dsonar.projectKey=mernapp \
                -Dsonar.projectVersion=${VERSION} \
                -Dsonar.sources=. \
                -Dsonar.host.url=${SONARQUBE_URL} \
                -Dsonar.login=${SONAR_TOKEN}
            """
          }
        }
      }
    }

    stage('Build & Push Images') {
      steps {
        container('kaniko') {
          withCredentials([usernamePassword(credentialsId: 'docker-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
            sh """
              /kaniko/executor --context \$WORKSPACE/frontend --dockerfile \$WORKSPACE/frontend/Dockerfile --destination registry.gitlab.com/votre-compte/frontend:${VERSION} --destination registry.gitlab.com/votre-compte/frontend:latest --cache=true
              /kaniko/executor --context \$WORKSPACE/backend --dockerfile \$WORKSPACE/backend/Dockerfile --destination registry.gitlab.com/votre-compte/backend:${VERSION} --destination registry.gitlab.com/votre-compte/backend:latest --cache=true
            """
      }
    }
  }
}


    stage('Scan Images with Trivy') {
      steps {
        container('trivy') {
          sh """
            trivy image ${DOCKER_REGISTRY}/frontend:${VERSION} > frontend-trivy-report.txt
            trivy image ${DOCKER_REGISTRY}/backend:${VERSION} > backend-trivy-report.txt
          """
        }
      }
      post {
        always {
          archiveArtifacts artifacts: '*.txt', allowEmptyArchive: true
        }
      }
    }
  }

  post {
    always {
      cleanWs()
    }
    success {
      echo "✅ Build & Push réussi pour version ${VERSION}"
    }
    failure {
      echo "❌ Build échoué - voir les logs"
    }
  }
}
