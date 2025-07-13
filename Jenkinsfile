pipeline {
  agent {
    kubernetes {
      label 'jenkins-mern-img'
      defaultContainer 'jnlp'
      yaml """
apiVersion: v1
kind: Pod
metadata:
  labels:
    jenkins: slave
spec:
  containers:
    - name: jnlp
      image: jenkins/inbound-agent:latest
      args: ['\$(JENKINS_SECRET)', '\$(JENKINS_NAME)']
      env:
        - name: JENKINS_URL
          value: http://192.168.56.80:8080
      ports:
        - containerPort: 50000
          name: jnlp
      resources:
        limits:
          memory: "512Mi"
          cpu: "500m"
        requests:
          memory: "256Mi"
          cpu: "200m"

    - name: node
      image: node:18
      command:
        - cat
      tty: true

    - name: img
      image: docker.io/genuinetools/img:latest
      command:
        - cat
      tty: true

    - name: sonar-scanner
      image: sonarsource/sonar-scanner-cli:latest
      command:
        - cat
      tty: true

    - name: trivy
      image: aquasec/trivy:latest
      command:
        - cat
      tty: true

  restartPolicy: Never
"""
    }
  }

environment {
  DOCKER_REGISTRY = 'registry.gitlab.com'
  IMAGE_NAME = 'https://gitlab.com/waruimoojin/mernapp'  // chemin complet du repo GitLab
  IMAGE_TAG = "jenkins-${env.BUILD_NUMBER}"
}


  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Image') {
      steps {
        container('img') {
          script {
            // Si besoin de docker config pour push (via secret Jenkins)
            sh """
              mkdir -p ~/.docker
              echo '\$DOCKER_CONFIG_JSON' > ~/.docker/config.json
            """
            sh "img build -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} ."
          }
        }
      }
    }

    stage('Push Image') {
      steps {
        container('img') {
          sh "img push ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
        }
      }
    }

    stage('SonarQube Scan') {
      steps {
        container('sonar-scanner') {
          sh 'sonar-scanner'
        }
      }
    }

    stage('Security Scan') {
      steps {
        container('trivy') {
          sh "trivy image --exit-code 1 --severity HIGH,CRITICAL ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
        }
      }
    }
  }

  post {
    always {
      container('node') {
        cleanWs()
      }
    }
  }
}
