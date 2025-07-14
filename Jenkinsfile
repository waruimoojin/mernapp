pipeline {
    agent any

    environment {
        // Configuration Docker
        REGISTRY = "registry.gitlab.com"
        FRONTEND_IMAGE = "${REGISTRY}/frontend:latest"
        BACKEND_IMAGE = "${REGISTRY}/backend:latest"
        DOCKER_CREDENTIALS_ID = "gitlab-registry-credentials"  // ID des credentials Docker dans Jenkins

        // Configuration Git
        GIT_CREDENTIALS_ID = "gitlab-https-token"  // ID des credentials Git HTTPS

        // Configuration SonarQube
        SONARQUBE_SERVER = 'SonarQube'  // Nom du serveur configuré dans Jenkins
        SONAR_TOKEN_CREDENTIAL_ID = "sonarqube-token"  // ID du token Sonar

        // Configuration Trivy
        TRIVY_API_URL = "http://trivy-server.my-domain/api/v1/scan/image"
    }

    stages {
        // Étape 1: Checkout du code
        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    extensions: [],
                    userRemoteConfigs: [[
                        url: 'https://gitlab.com/waruimoojin/mernapp.git',
                        credentialsId: env.GIT_CREDENTIALS_ID
                    ]]
                ])
            }
        }

        // Étape 2: Installation des dépendances et tests
        stage('Install & Test') {
            steps {
                script {
                    // Backend
                    sh '''
                        cd backend
                        npm install
                        npm test
                    '''

                    // Frontend
                    sh '''
                        cd frontend
                        npm install
                        npm test
                    '''
                }
            }
        }

        // Étape 3: Analyse SonarQube
        stage('SonarQube Analysis') {
            steps {
                withCredentials([string(credentialsId: env.SONAR_TOKEN_CREDENTIAL_ID, variable: 'SONAR_TOKEN')]) {
                    script {
                        // Analyse backend
                        withSonarQubeEnv(env.SONARQUBE_SERVER) {
                            sh '''
                                cd backend
                                sonar-scanner -Dsonar.login=$SONAR_TOKEN
                            '''
                        }

                        // Analyse frontend
                        withSonarQubeEnv(env.SONARQUBE_SERVER) {
                            sh '''
                                cd frontend
                                sonar-scanner -Dsonar.login=$SONAR_TOKEN
                            '''
                        }
                    }
                }
            }
        }

        // Étape 4: Build et push des images Docker
        stage('Build & Push Docker Images') {
            steps {
                script {
                    docker.withRegistry("https://${env.REGISTRY}", env.DOCKER_CREDENTIALS_ID) {
                        // Backend
                        def backendImage = docker.build(env.BACKEND_IMAGE, './backend')
                        backendImage.push()

                        // Frontend
                        def frontendImage = docker.build(env.FRONTEND_IMAGE, './frontend')
                        frontendImage.push()
                    }
                }
            }
        }

        // Étape 5: Scan de sécurité avec Trivy
        stage('Security Scan with Trivy') {
            steps {
                script {
                    def scanImage = { image ->
                        echo "Scanning ${image} with Trivy"
                        def response = sh(
                            script: "curl -s -X POST -H 'Content-Type: application/json' -d '{\"image\": \"${image}\"}' ${env.TRIVY_API_URL}",
                            returnStdout: true
                        )
                        echo "Trivy results for ${image}: ${response}"
                    }

                    scanImage(env.BACKEND_IMAGE)
                    scanImage(env.FRONTEND_IMAGE)
                }
            }
        }
    }

    post {
        always {
            // Nettoyage du workspace
            cleanWs()
        }
        failure {
            // Notification en cas d'échec
            emailext (
                subject: "Échec du build Jenkins - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
                    Le build ${env.BUILD_NUMBER} du job ${env.JOB_NAME} a échoué.
                    Consultez les logs ici: ${env.BUILD_URL}
                """,
                to: 'votre-email@domaine.com'
            )
        }
    }
}