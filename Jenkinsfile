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
    image: node:20-alpine 
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

        // Étape 2: Installation des dépendances et configuration des tests
        stage('Setup Testing') {
            parallel {
                stage('Frontend Setup') {
                    steps {
                        container('nodejs') {
                            script {
                                dir('frontend') {
                                    sh '''
                                        npm install --save-dev \
                                            @testing-library/react \
                                            @testing-library/jest-dom \
                                            jest \
                                            babel-jest \
                                            @babel/preset-env \
                                            @babel/preset-react \
                                            jest-junit
                                        
                                        echo '{
                                          "presets": ["@babel/preset-env", "@babel/preset-react"],
                                          "plugins": ["@babel/plugin-transform-modules-commonjs"]
                                        }' > babel.config.json
                                        
                                        echo 'module.exports = {
                                          testEnvironment: "jsdom",
                                          setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
                                          reporters: [
                                            "default",
                                            ["jest-junit", { outputDirectory: "test-results", outputName: "junit.xml" }]
                                          ],
                                          collectCoverage: true,
                                          coverageReporters: ["lcov", "text"],
                                          coverageDirectory: "coverage"
                                        };' > jest.config.js
                                    '''
                                }
                            }
                        }
                    }
                }
                stage('Backend Setup') {
                    steps {
                        container('nodejs') {
                            script {
                                dir('backend') {
                                    sh '''
                                        npm install --save-dev jest supertest jest-junit
                                        
                                        echo 'module.exports = {
                                          testEnvironment: "node",
                                          reporters: [
                                            "default",
                                            ["jest-junit", { outputDirectory: "test-results", outputName: "junit.xml" }]
                                          ],
                                          collectCoverage: true,
                                          coverageReporters: ["lcov", "text"],
                                          coverageDirectory: "coverage"
                                        };' > jest.config.js
                                    '''
                                }
                            }
                        }
                    }
                }
            }
        }

        // Étape 3: Exécution des tests
        stage('Run Tests') {
            parallel {
                stage('Frontend Tests') {
                    steps {
                        container('nodejs') {
                            script {
                                dir('frontend') {
                                    sh '''
                                        npm run test -- --ci --coverage
                                    '''
                                    junit 'test-results/junit.xml'
                                    publishHTML target: [
                                        allowMissing: false,
                                        alwaysLinkToLastBuild: false,
                                        keepAll: true,
                                        reportDir: 'coverage/lcov-report',
                                        reportFiles: 'index.html',
                                        reportName: 'Frontend Coverage Report'
                                    ]
                                }
                            }
                        }
                    }
                }
                stage('Backend Tests') {
                    steps {
                        container('nodejs') {
                            script {
                                dir('backend') {
                                    sh '''
                                        # Crée un test de base si aucun test n'existe
                                        if [ ! -d "__tests__" ]; then
                                            mkdir -p __tests__
                                            echo "const request = require('supertest');
                                            const app = require('../app');

                                            describe('GET /', () => {
                                              it('should return 200 OK', async () => {
                                                const res = await request(app).get('/');
                                                expect(res.statusCode).toEqual(200);
                                              });
                                            });" > __tests__/app.test.js
                                        fi
                                        
                                        npm run test -- --ci --coverage
                                    '''
                                    junit 'test-results/junit.xml'
                                    publishHTML target: [
                                        allowMissing: false,
                                        alwaysLinkToLastBuild: false,
                                        keepAll: true,
                                        reportDir: 'coverage/lcov-report',
                                        reportFiles: 'index.html',
                                        reportName: 'Backend Coverage Report'
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        }

        // Étape 4: Analyse SonarQube
        stage('SonarQube Analysis') {
            steps {
                container('sonar') {
                    withCredentials([string(credentialsId: env.SONAR_TOKEN_CREDENTIAL_ID, variable: 'SONAR_TOKEN')]) {
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

        // Étape 5: Build et push des images Docker
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

        // Étape 6: Scan de sécurité avec Trivy
        stage('Security Scan with Trivy') {
            steps {
                container('docker') {
                    script {
                        sh '''
                            apk add --no-cache curl
                            curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
                            
                            trivy image --exit-code 0 --severity HIGH,CRITICAL --format json -o backend-trivy-report.json ${BACKEND_IMAGE}:${BUILD_NUMBER}
                            trivy image --exit-code 0 --severity HIGH,CRITICAL --format json -o frontend-trivy-report.json ${FRONTEND_IMAGE}:${BUILD_NUMBER}
                            
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
            archiveArtifacts artifacts: '**/test-results/*.xml,**/coverage/**/*,**/*-trivy-report.json', allowEmptyArchive: true
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            script {
                mail to: 'votre-email@domaine.com',
                     subject: "Échec du build - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                     body: "Voir les détails: ${env.BUILD_URL}"
            }
        }
    }
}