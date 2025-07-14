pipeline {
    agent any

    environment {
        REGISTRY = "registry.gitlab.com"
        FRONTEND_IMAGE = "${REGISTRY}/frontend:latest"
        BACKEND_IMAGE = "${REGISTRY}/backend:latest"
        DOCKER_CREDENTIALS_ID = "gitlab-registry-credentials"
        SONARQUBE_SERVER = 'SonarQube'
        SONAR_TOKEN_CREDENTIAL_ID = "sonarquibe-token"
        TRIVY_API_URL = "http://trivy-server.my-domain/api/v1/scan/image"
        GIT_HTTPS_CREDENTIALS_ID = "gitlab-https-token"
    }

    stages {
        stage('Install Docker') {
            steps {
                script {
                    // Installer Docker CLI
                    sh '''
                        curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-20.10.9.tgz -o docker.tgz
                        tar xzvf docker.tgz
                        mv docker/docker /usr/local/bin/
                        rm -rf docker docker.tgz
                        docker --version
                    '''
                }
            }
        }

        stage('Checkout') {
            steps {
                checkout([$class: 'GitSCM', branches: [[name: '*/main']], userRemoteConfigs: [[url: 'https://gitlab.com/waruimoojin/mernapp.git', credentialsId: env.GIT_HTTPS_CREDENTIALS_ID]]])
            }
        }

        stage('Tests') {
            steps {
                script {
                    sh 'docker run --rm -v ${WORKSPACE}/backend:/app node:18 sh -c "cd /app && npm install && npm test"'
                    sh 'docker run --rm -v ${WORKSPACE}/frontend:/app node:18 sh -c "cd /app && npm install && npm test"'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withCredentials([string(credentialsId: env.SONAR_TOKEN_CREDENTIAL_ID, variable: 'SONAR_TOKEN')]) {
                    script {
                        sh "docker run --rm -e SONAR_LOGIN=\$SONAR_TOKEN -v ${WORKSPACE}:/usr/src sonarsource/sonar-scanner-cli:4.8 -Dsonar.projectBaseDir=/usr/src/backend"
                        sh "docker run --rm -e SONAR_LOGIN=\$SONAR_TOKEN -v ${WORKSPACE}:/usr/src sonarsource/sonar-scanner-cli:4.8 -Dsonar.projectBaseDir=/usr/src/frontend"
                    }
                }
            }
        }

        stage('Build & Push') {
            steps {
                script {
                    sh "docker build -t ${env.BACKEND_IMAGE} ./backend"
                    sh "docker build -t ${env.FRONTEND_IMAGE} ./frontend"
                    
                    withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDENTIALS_ID, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASSWORD')]) {
                        sh "echo ${env.DOCKER_PASSWORD} | docker login -u ${env.DOCKER_USER} --password-stdin ${env.REGISTRY}"
                        sh "docker push ${env.BACKEND_IMAGE}"
                        sh "docker push ${env.FRONTEND_IMAGE}"
                    }
                }
            }
        }

        stage('Scan with Trivy') {
            steps {
                script {
                    def scanImage = { image ->
                        sh "curl -s -X POST -H 'Content-Type: application/json' -d '{\"image\": \"${image}\"}' ${env.TRIVY_API_URL}"
                    }
                    scanImage(env.BACKEND_IMAGE)
                    scanImage(env.FRONTEND_IMAGE)
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        failure {
            script {
                echo "BUILD FAILED: ${env.BUILD_URL}"
            }
        }
    }
}