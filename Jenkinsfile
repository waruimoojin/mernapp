pipeline {
    agent any

    options {
        skipDefaultCheckout true
    }

    environment {
        REGISTRY = "registry.gitlab.com"
        FRONTEND_IMAGE = "${REGISTRY}/frontend:latest"
        BACKEND_IMAGE = "${REGISTRY}/backend:latest"
        DOCKER_CREDENTIALS_ID = "gitlab-registry-credentials"
        SONARQUBE_SERVER = 'SonarQube'
        SONAR_TOKEN_CREDENTIAL_ID = "sonarqube-token"
        TRIVY_API_URL = "http://trivy-server.my-domain/api/v1/scan/image"
        GIT_HTTPS_CREDENTIALS_ID = "gitlab-https-token"
    }

    stages {
        stage('Setup Tools') {
            steps {
                script {
                    // Installer les dépendances système
                    sh '''
                        apt-get update
                        apt-get install -y curl git unzip
                    '''
                    
                    // Installer Node.js
                    sh '''
                        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
                        apt-get install -y nodejs
                        node -v
                    '''
                    
                    // Installer Docker
                    sh '''
                        curl -fsSL https://get.docker.com -o get-docker.sh
                        sh get-docker.sh
                        docker version
                    '''
                    
                    // Installer SonarScanner
                    sh '''
                        wget https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.8.0.2856-linux.zip
                        unzip sonar-scanner-cli-4.8.0.2856-linux.zip
                        mv sonar-scanner-4.8.0.2856-linux /opt/sonar-scanner
                        ln -s /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner
                        sonar-scanner -v
                    '''
                }
            }
        }

        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: 'main']],
                    extensions: [],
                    userRemoteConfigs: [[
                        url: 'https://gitlab.com/waruimoojin/mernapp.git',
                        credentialsId: env.GIT_HTTPS_CREDENTIALS_ID
                    ]]
                ])
            }
        }

        stage('Tests') {
            steps {
                script {
                    sh 'cd backend && npm install && npm test'
                    sh 'cd frontend && npm install && npm test'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withCredentials([
                    string(credentialsId: env.SONAR_TOKEN_CREDENTIAL_ID, 
                            variable: 'SONAR_TOKEN')
                ]) {
                    dir('backend') {
                        withSonarQubeEnv(env.SONARQUBE_SERVER) {
                            sh 'sonar-scanner -Dsonar.login=$SONAR_TOKEN'
                        }
                    }
                    dir('frontend') {
                        withSonarQubeEnv(env.SONARQUBE_SERVER) {
                            sh 'sonar-scanner -Dsonar.login=$SONAR_TOKEN'
                        }
                    }
                }
            }
        }

        stage('Build & Push Docker Images') {
            steps {
                script {
                    docker.withRegistry("https://${env.REGISTRY}", env.DOCKER_CREDENTIALS_ID) {
                        sh 'cd backend && docker build -t ${BACKEND_IMAGE} .'
                        sh 'docker push ${BACKEND_IMAGE}'
                        
                        sh 'cd frontend && docker build -t ${FRONTEND_IMAGE} .'
                        sh 'docker push ${FRONTEND_IMAGE}'
                    }
                }
            }
        }

        stage('Scan Images with Trivy API') {
            steps {
                script {
                    def scanImage = { image ->
                        echo "Scanning image ${image} with Trivy API"
                        sh """
                            curl -s -X POST \
                            -H 'Content-Type: application/json' \
                            -d '{"image": "${image}"}' \
                            ${env.TRIVY_API_URL}
                        """
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
                // Solution simple pour notification
                echo "BUILD FAILED: ${env.BUILD_URL}"
            }
        }
    }
}