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
                    // Solution simplifiée sans apt-get
                    sh '''
                        # Installer Node.js (méthode alternative)
                        curl -fsSL https://nodejs.org/dist/v18.18.0/node-v18.18.0-linux-x64.tar.xz -o node.tar.xz
                        tar -xJf node.tar.xz
                        export PATH="$PWD/node-v18.18.0-linux-x64/bin:$PATH"
                        node -v
                        
                        # Installer Docker CLI uniquement
                        curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-20.10.9.tgz -o docker.tgz
                        tar xzvf docker.tgz
                        export PATH="$PWD/docker:$PATH"
                        docker --version
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
                withCredentials([string(credentialsId: env.SONAR_TOKEN_CREDENTIAL_ID, variable: 'SONAR_TOKEN')]) {
                    script {
                        // Utilisation de l'image Docker pour SonarScanner
                        sh "docker run --rm -e SONAR_LOGIN=\$SONAR_TOKEN -v ${WORKSPACE}:/usr/src sonarsource/sonar-scanner-cli:4.8 -Dsonar.projectBaseDir=/usr/src/backend"
                        sh "docker run --rm -e SONAR_LOGIN=\$SONAR_TOKEN -v ${WORKSPACE}:/usr/src sonarsource/sonar-scanner-cli:4.8 -Dsonar.projectBaseDir=/usr/src/frontend"
                    }
                }
            }
        }

        stage('Build & Push Images') {
            steps {
                script {
                    // Utilisation de Kaniko pour builder les images
                    sh """
                        # Builder l'image backend
                        /kaniko/executor \\
                            --context \${WORKSPACE}/backend \\
                            --destination \${BACKEND_IMAGE} \\
                            --skip-tls-verify \\
                            --dockerfile \${WORKSPACE}/backend/Dockerfile
                        
                        # Builder l'image frontend
                        /kaniko/executor \\
                            --context \${WORKSPACE}/frontend \\
                            --destination \${FRONTEND_IMAGE} \\
                            --skip-tls-verify \\
                            --dockerfile \${WORKSPACE}/frontend/Dockerfile
                    """
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