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
    command: ["cat"]
    tty: true
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
  - name: docker
    image: docker:20.10-cli
    command: ["cat"]
    tty: true
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
'''
        }
    }

    environment {
        REGISTRY = "registry.gitlab.com"
        PROJECT_PATH = "waruimoojin/mernapp"
        FRONTEND_IMAGE = "${REGISTRY}/${PROJECT_PATH}/frontend"
        BACKEND_IMAGE = "${REGISTRY}/${PROJECT_PATH}/backend"
        DOCKER_CREDENTIALS_ID = "gitlab-registry-credentials"
        GIT_CREDENTIALS_ID = "gitlab-https-token"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[
                        url: 'https://gitlab.com/waruimoojin/mernapp.git',
                        credentialsId: env.GIT_CREDENTIALS_ID
                    ]]
                ])
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Frontend') {
                    steps {
                        container('nodejs') {
                            dir('frontend') {
                                sh '''
                                    npm install
                                    npm install --save-dev \
                                        @testing-library/react \
                                        @testing-library/jest-dom \
                                        jest \
                                        babel-jest \
                                        @babel/preset-env \
                                        @babel/preset-react \
                                        react-router-dom
                                '''
                            }
                        }
                    }
                }
                stage('Backend') {
                    steps {
                        container('nodejs') {
                            dir('backend') {
                                sh '''
                                    npm install
                                    npm install --save-dev jest supertest
                                '''
                            }
                        }
                    }
                }
            }
        }

         stage('Run Tests') {
            parallel {
                stage('Frontend Tests') {
                    steps {
                        container('nodejs') {
                            dir('frontend') {
                                sh '''
                                    # Configuration spécifique pour Jest
                                    echo 'module.exports = {
                                      testResultsProcessor: "jest-junit",
                                      reporters: [
                                        "default",
                                        ["jest-junit", {
                                          outputDirectory: "test-results",
                                          outputName: "junit.xml"
                                        }]
                                      ]
                                    };' > jest.config.js

                                    npm test -- --ci --coverage
                                '''
                                junit 'frontend/test-results/junit.xml'
                            }
                        }
                    }
                }
                stage('Backend Tests') {
                    steps {
                        container('nodejs') {
                            dir('backend') {
                                sh '''
                                     # Configuration Jest pour le backend
                                    echo 'module.exports = {
                                      testResultsProcessor: "jest-junit",
                                      reporters: [
                                        "default",
                                        ["jest-junit", {
                                          outputDirectory: "test-results",
                                          outputName: "junit.xml"
                                        }]
                                      ]
                                    };' > jest.config.js

                                    npm test -- --ci --coverage
                                '''
                                junit 'backend/test-results/junit.xml'
                            }
                        }
                    }
                }
            }
        }

        stage('Build & Push') {
            parallel {
                stage('Backend') {
                    steps {
                        container('docker') {
                            script {
                                withCredentials([usernamePassword(
                                    credentialsId: env.DOCKER_CREDENTIALS_ID,
                                    usernameVariable: 'DOCKER_USERNAME',
                                    passwordVariable: 'DOCKER_PASSWORD'
                                )]) {
                                    sh '''
                                        echo $DOCKER_PASSWORD | docker login $REGISTRY -u $DOCKER_USERNAME --password-stdin
                                        cd backend
                                        docker build -t ${BACKEND_IMAGE}:${BUILD_NUMBER} .
                                        docker push ${BACKEND_IMAGE}:${BUILD_NUMBER}
                                    '''
                                }
                            }
                        }
                    }
                }
                stage('Frontend') {
                    steps {
                        container('docker') {
                            script {
                                withCredentials([usernamePassword(
                                    credentialsId: env.DOCKER_CREDENTIALS_ID,
                                    usernameVariable: 'DOCKER_USERNAME',
                                    passwordVariable: 'DOCKER_PASSWORD'
                                )]) {
                                    sh '''
                                        echo $DOCKER_PASSWORD | docker login $REGISTRY -u $DOCKER_USERNAME --password-stdin
                                        cd frontend
                                        docker build -t ${FRONTEND_IMAGE}:${BUILD_NUMBER} .
                                        docker push ${FRONTEND_IMAGE}:${BUILD_NUMBER}
                                    '''
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: '**/coverage/**/*,**/junit.xml'
            cleanWs()
        }
        failure {
            script {
                // Solution simplifiée pour les notifications
                echo "Build failed - ${BUILD_URL}"
            }
        }
    }
}