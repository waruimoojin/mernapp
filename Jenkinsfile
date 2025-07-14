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
        GIT_HTTPS_CREDENTIALS_ID = "gitlab-https-token"  // Nouveau credential HTTPS
    }

    stages {
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
                        def backendImage = docker.build(env.BACKEND_IMAGE, './backend')
                        backendImage.push()

                        def frontendImage = docker.build(env.FRONTEND_IMAGE, './frontend')
                        frontendImage.push()
                    }
                }
            }
        }

        stage('Scan Images with Trivy API') {
            steps {
                script {
                    def scanImage = { image ->
                        echo "Scanning image ${image} with Trivy API"
                        def jsonPayload = """{"image": "${image}"}"""
                        def response = sh(
                            script: "curl -s -X POST -H 'Content-Type: application/json' -d '${jsonPayload}' ${env.TRIVY_API_URL}",
                            returnStdout: true
                        ).trim()
                        echo "Trivy scan result: ${response}"

                        def json = readJSON text: response
                        def vulnerabilities = json.Results[0]?.Vulnerabilities ?: []
                        def criticals = vulnerabilities.findAll { it.Severity == 'CRITICAL' }
                        if (criticals.size() > 0) {
                            error("Trivy found CRITICAL vulnerabilities! Build failed.")
                        }
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
                // Solution temporaire pour les emails
                echo "Build failed! Sending email to admin"
                mail to: 'chakib56@gmail.com',
                     subject: "BUILD FAILED: ${currentBuild.fullDisplayName}",
                     body: "Check build: ${env.BUILD_URL}"
            }
        }
    }
}