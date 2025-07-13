pipeline {
  agent {
    kubernetes {
      label 'jenkins-docker-agent'
      defaultContainer 'docker'
      yaml """
apiVersion: v1
kind: Pod
metadata:
  labels:
    jenkins: slave
spec:
  containers:
    - name: docker
      image: docker:24.0.5
      command:
        - cat
      tty: true
      env:
        - name: DOCKER_HOST
          value: tcp://localhost:2375
      volumeMounts:
        - name: docker-graph-storage
          mountPath: /var/lib/docker

    - name: dind
      image: docker:24.0.5-dind
      securityContext:
        privileged: true
      ports:
        - containerPort: 2375
      command:
        - dockerd-entrypoint.sh
      args:
        - --host=tcp://0.0.0.0:2375
        - --host=unix:///var/run/docker.sock
      volumeMounts:
        - name: docker-graph-storage
          mountPath: /var/lib/docker

  volumes:
    - name: docker-graph-storage
      emptyDir: {}
  restartPolicy: Never
"""
    }
  }

  environment {
    DOCKER_REGISTRY = 'registry.gitlab.com'
    IMAGE_NAME = 'waruimoojin/mernapp'  // chemin complet du repo GitLab
    IMAGE_TAG = "jenkins-${env.BUILD_NUMBER}"
}


  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Docker Image') {
      steps {
        container('docker') {
          sh """
            docker build -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} .
          """
        }
      }
    }

    stage('Push Docker Image') {
      steps {
        container('docker') {
          withCredentials([usernamePassword(credentialsId: 'gitlab-docker-credentials', usernameVariable: 'CI_REGISTRY_USER', passwordVariable: 'CI_REGISTRY_PASSWORD')]) {
            sh """
              echo "\$CI_REGISTRY_PASSWORD" | docker login -u "\$CI_REGISTRY_USER" --password-stdin ${DOCKER_REGISTRY}
                docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
          """
          }
        }
      }
    }

    stage('SonarQube Scan') {
      steps {
        container('docker') {
          sh 'sonar-scanner'  // adapte si besoin, tu peux aussi avoir un container sonar dans le pod si tu veux
        }
      }
    }

    stage('Security Scan') {
      steps {
        container('docker') {
          sh "trivy image --exit-code 1 --severity HIGH,CRITICAL ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
        }
      }
    }
  }

  post {
    always {
      cleanWs()
    }
  }
}
