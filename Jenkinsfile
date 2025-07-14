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
        DOCKER_BIN = "${WORKSPACE}/bin"  // Nouveau répertoire pour Docker
    }

    stages {
        stage('Install Docker') {
            steps {
                script {
                    // Installer Docker dans le workspace
                    sh '''
                        mkdir -p ${DOCKER_BIN}
                        curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-20.10.9.tgz -o docker.tgz
                        tar xzvf docker.tgz
                        mv docker/docker ${DOCKER_BIN}/
                        rm -rf docker docker.tgz
                        chmod +x ${DOCKER_BIN}/docker
                        ${DOCKER_BIN}/docker --version
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
                    // Utiliser le Docker installé
                    sh '''
                        export PATH="${DOCKER_BIN}:$PATH"
                        docker run --rm -v ${WORKSPACE}/backend:/app node:18 sh -c "cd /app && npm install && npm test"
                        docker run --rm -v ${WORKSPACE}/frontend:/app node:18 sh -c "cd /app && npm install && npm test"
                    '''
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withCredentials([string(credentialsId: env.SONAR_TOKEN_CREDENTIAL_ID, variable: 'SONAR_TOKEN')]) {
                    script {
                        sh '''
                            export PATH="${DOCKER_BIN}:$PATH"
                            docker run --rm -e SONAR_LOGIN=$SONAR_TOKEN -v ${WORKSPACE}:/usr/src sonarsource/sonar-scanner-cli:4.8 -Dsonar.projectBaseDir=/usr/src/backend
                            docker run --rm -e SONAR_LOGIN=$SONAR_TOKEN -v ${WORKSPACE}:/usr/src sonarsource/sonar-scanner-cli:4.8 -Dsonar.projectBaseDir=/usr/src/frontend
                        '''
                    }
                }
            }
        }

        stage('Build & Push') {
            steps {
                script {
                    sh '''
                        export PATH="${DOCKER_BIN}:$PATH"
                        docker build -t ${BACKEND_IMAGE} ./backend
                        docker build -t ${FRONTEND_IMAGE} ./frontend
                        
                        withCredentials([usernamePassword(credentialsId: "${DOCKER_CREDENTIALS_ID}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASSWORD')]) {
                            echo "${DOCKER_PASSWORD}" | docker login -u "${DOCKER_USER}" --password-stdin ${REGISTRY}
                            docker push ${BACKEND_IMAGE}
                            docker push ${FRONTEND_IMAGE}
                        }
                    '''
                }
            }
        }

        stage('Scan with Trivy') {
            steps {
                script {
                    sh 'export PATH="${DOCKER_BIN}:$PATH"'
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