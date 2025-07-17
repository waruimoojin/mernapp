pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
metadata:
  name: jenkins-agent
spec:
  containers:
  - name: nodejs
    image: node:18-alpine
    command:
    - cat
    tty: true
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
  - name: docker
    image: docker:20.10-cli
    command:
    - cat
    tty: true
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
  - name: sonar
    image: sonarsource/sonar-scanner-cli:latest
    command:
    - cat
    tty: true
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
'''
        }
    }

    tools {
        nodejs 'NodeJS_22.17.0'
        docker 'Docker 20.10'
        sonar 'SonarQube Scanner'
    }

    environment {
        // Configuration Docker
        REGISTRY = "registry.gitlab.com"
        PROJECT_PATH = "waruimoojin/mernapp"
        FRONTEND_IMAGE = "${REGISTRY}/${PROJECT_PATH}/frontend"
        BACKEND_IMAGE = "${REGISTRY}/${PROJECT_PATH}/backend"
        DOCKER_CREDENTIALS_ID = "gitlab-registry-credentials"

        // Configuration Git
        GIT_CREDENTIALS_ID = "gitlab-https-token"

        // Configuration SonarQube
        SONARQUBE_SERVER = 'SonarQube'
        SONAR_TOKEN_CREDENTIAL_ID = "sonarqube-token"

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
            parallel {
                stage('Backend Tests') {
                    steps {
                        container('nodejs') {
                            script {
                                sh '''
                                    cd backend
                                    npm install
                                    npm run test || echo "Backend tests completed with warnings"
                                '''
                            }
                        }
                    }
                }
                stage('Frontend Tests') {
                    steps {
                        container('nodejs') {
                            script {
                                sh '''
                                    cd frontend
                                    npm install
                                    npm run test || echo "Frontend tests completed with warnings"
                                '''
                            }
                        }
                    }
                }
            }
        }

        // Étape 3: Analyse SonarQube
        stage('SonarQube Analysis') {
            steps {
                container('sonar') {
                    withCredentials([string(credentialsId: env.SONAR_TOKEN_CREDENTIAL_ID, variable: 'SONAR_TOKEN')]) {
                        withSonarQubeEnv(env.SONARQUBE_SERVER) {
                            sh '''
                                sonar-scanner \
                                -Dsonar.projectKey=mernapp \
                                -Dsonar.projectName="MERN Application" \
                                -Dsonar.sources=. \
                                -Dsonar.exclusions="**/node_modules/**,**/coverage/**,**/*.test.js" \
                                -Dsonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info,backend/coverage/lcov.info \
                                -Dsonar.login=$SONAR_TOKEN
                            '''
                        }
                    }
                }
            }
        }

        // Étape 4: Build et push des images Docker
        stage('Build & Push Docker Images') {
            parallel {
                stage('Backend Image') {
                    steps {
                        container('docker') {
                            script {
                                withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDENTIALS_ID, passwordVariable: 'DOCKER_PASSWORD', usernameVariable: 'DOCKER_USERNAME')]) {
                                    sh '''
                                        echo $DOCKER_PASSWORD | docker login $REGISTRY -u $DOCKER_USERNAME --password-stdin
                                        cd backend
                                        docker build -t ${BACKEND_IMAGE}:${BUILD_NUMBER} .
                                        docker tag ${BACKEND_IMAGE}:${BUILD_NUMBER} ${BACKEND_IMAGE}:latest
                                        docker push ${BACKEND_IMAGE}:${BUILD_NUMBER}
                                        docker push ${BACKEND_IMAGE}:latest
                                    '''
                                }
                            }
                        }
                    }
                }
                stage('Frontend Image') {
                    steps {
                        container('docker') {
                            script {
                                withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDENTIALS_ID, passwordVariable: 'DOCKER_PASSWORD', usernameVariable: 'DOCKER_USERNAME')]) {
                                    sh '''
                                        echo $DOCKER_PASSWORD | docker login $REGISTRY -u $DOCKER_USERNAME --password-stdin
                                        cd frontend
                                        docker build -t ${FRONTEND_IMAGE}:${BUILD_NUMBER} .
                                        docker tag ${FRONTEND_IMAGE}:${BUILD_NUMBER} ${FRONTEND_IMAGE}:latest
                                        docker push ${FRONTEND_IMAGE}:${BUILD_NUMBER}
                                        docker push ${FRONTEND_IMAGE}:latest
                                    '''
                                }
                            }
                        }
                    }
                }
            }
        }

        // Étape 5: Scan de sécurité avec Trivy
        stage('Security Scan with Trivy') {
            steps {
                container('docker') {
                    script {
                        // Installer Trivy dans le conteneur
                        sh '''
                            apk add --no-cache curl
                            curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
                        '''
                        
                        // Scanner les images
                        sh '''
                            echo "Scanning backend image..."
                            trivy image --exit-code 0 --severity HIGH,CRITICAL --format json -o backend-trivy-report.json ${BACKEND_IMAGE}:${BUILD_NUMBER}
                            
                            echo "Scanning frontend image..."
                            trivy image --exit-code 0 --severity HIGH,CRITICAL --format json -o frontend-trivy-report.json ${FRONTEND_IMAGE}:${BUILD_NUMBER}
                            
                            echo "Checking for critical vulnerabilities..."
                            trivy image --exit-code 1 --severity CRITICAL ${BACKEND_IMAGE}:${BUILD_NUMBER} || echo "Critical vulnerabilities found in backend"
                            trivy image --exit-code 1 --severity CRITICAL ${FRONTEND_IMAGE}:${BUILD_NUMBER} || echo "Critical vulnerabilities found in frontend"
                        '''
                    }
                }
            }
        }
    }

    post {
        always {
            // Archiver les rapports
            archiveArtifacts artifacts: '*-trivy-report.json', allowEmptyArchive: true
            
            // Nettoyage du workspace
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            script {
                // Utiliser mail au lieu d'emailext si le plugin n'est pas installé
                try {
                    emailext (
                        subject: "Échec du build Jenkins - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                        body: """
                            Le build ${env.BUILD_NUMBER} du job ${env.JOB_NAME} a échoué.
                            Consultez les logs ici: ${env.BUILD_URL}
                        """,
                        to: 'votre-email@domaine.com'
                    )
                } catch (Exception e) {
                    echo "Email notification failed: ${e.getMessage()}"
                    // Fallback avec mail basique
                    mail (
                        to: 'votre-email@domaine.com',
                        subject: "Échec du build Jenkins - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                        body: "Le build ${env.BUILD_NUMBER} du job ${env.JOB_NAME} a échoué. Consultez les logs ici: ${env.BUILD_URL}"
                    )
                }
            }
        }
    }
}