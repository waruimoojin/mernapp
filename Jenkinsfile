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
        SONAR_TOKEN_CREDENTIAL_ID = "sonarquibe-token"
        TRIVY_API_URL = "http://trivy-server.my-domain/api/v1/scan/image"
        GIT_HTTPS_CREDENTIALS_ID = "gitlab-https-token"
    }

    stages {
        stage('Setup Tools') {
            steps {
                script {
                    // Installer les outils sans apt-get
                    sh '''
                        # Installer Node.js
                        curl -fsSL https://fnm.vercel.app/install | bash
                        export PATH="$HOME/.local/share/fnm:$PATH"
                        fnm install 18
                        fnm use 18
                        node -v
                        
                        # Installer Docker CLI uniquement
                        curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-20.10.9.tgz -o docker.tgz
                        tar xzvf docker.tgz
                        mv docker/docker /usr/local/bin/
                        rm -rf docker docker.tgz
                        docker --version
                        
                        # Installer SonarScanner
                        SONAR_SCANNER_VERSION="4.8.0.2856"
                        curl -fsSL https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${SONAR_SCANNER_VERSION}-linux.zip -o sonar-scanner.zip
                        unzip sonar-scanner.zip
                        mv sonar-scanner-${SONAR_SCANNER_VERSION}-linux /opt/sonar-scanner
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

        stage('Build & Push Images') {
            steps {
                script {
                    // Utilisation de Buildah pour construire les images sans démon Docker
                    sh '''
                        # Installer Buildah
                        apt-get update && apt-get install -y buildah || true
                        
                        # Build et push backend
                        cd backend
                        buildah bud -t ${BACKEND_IMAGE} .
                        buildah push ${BACKEND_IMAGE} docker://${BACKEND_IMAGE}
                        
                        # Build et push frontend
                        cd ../frontend
                        buildah bud -t ${FRONTEND_IMAGE} .
                        buildah push ${FRONTEND_IMAGE} docker://${FRONTEND_IMAGE}
                    '''
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
                echo "BUILD FAILED: ${env.BUILD_URL}"
            }
        }
    }
}