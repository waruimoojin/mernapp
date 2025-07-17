pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
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

    stages {
        stage('Checkout') {
            steps {
                checkout scm
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
                                    
                                    # Configuration Jest pour React
                                    echo 'module.exports = {
                                      preset: "react-app",
                                      testEnvironment: "jsdom",
                                      setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
                                      moduleNameMapper: {
                                        "^react-router-dom$": "<rootDir>/node_modules/react-router-dom",
                                        "\\.(css|less)$": "identity-obj-proxy"
                                      }
                                    };' > jest.config.js
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
                                    # Création fichier de test si inexistant
                                    if [ ! -f "src/App.test.js" ]; then
                                        echo "import { render, screen } from '@testing-library/react';
                                        import App from './App';
                                        
                                        test('renders without crashing', () => {
                                          render(<App />);
                                        });" > src/App.test.js
                                    fi
                                    
                                    npm test -- --ci --coverage --reporters=default --reporters=jest-junit
                                '''
                                junit 'frontend/junit.xml'
                                publishHTML target: [
                                    allowMissing: true,
                                    reportDir: 'frontend/coverage/lcov-report',
                                    reportFiles: 'index.html',
                                    reportName: 'Frontend Coverage'
                                ]
                            }
                        }
                    }
                }
                stage('Backend Tests') {
                    steps {
                        container('nodejs') {
                            dir('backend') {
                                sh '''
                                    # Création fichier de test si inexistant
                                    if [ ! -f "__tests__/app.test.js" ]; then
                                        mkdir -p __tests__
                                        echo "const request = require('supertest');
                                        const app = require('../app');
                                        
                                        describe('Basic API tests', () => {
                                          it('should respond on /', async () => {
                                            const res = await request(app).get('/');
                                            expect(res.statusCode).toEqual(200);
                                          });
                                        });" > __tests__/app.test.js
                                    fi
                                    
                                    npm test -- --ci --coverage --reporters=default --reporters=jest-junit
                                '''
                                junit 'backend/junit.xml'
                            }
                        }
                    }
                }
            }
        }

        stage('Build & Push') {
            when {
                expression { !currentBuild.result || currentBuild.result == 'SUCCESS' }
            }
            parallel {
                stage('Backend') {
                    steps {
                        container('docker') {
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
                stage('Frontend') {
                    steps {
                        container('docker') {
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

    post {
        always {
            archiveArtifacts artifacts: '**/junit.xml,**/coverage/**/*'
            cleanWs()
        }
        failure {
            echo "Build failed - ${BUILD_URL}"
        }
    }
}