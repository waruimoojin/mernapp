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
    - name: workspace-volume
      mountPath: /home/jenkins/agent
  - name: docker
    image: docker:20.10-dind
    command: ["cat"]
    tty: true
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
    - name: workspace-volume
      mountPath: /home/jenkins/agent
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
  - name: workspace-volume
    emptyDir: {}
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
                    ]],
                    extensions: [[
                        $class: 'CleanCheckout'
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
                                        react-router-dom \
                                        jest-junit
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
                                    npm install --save-dev jest supertest jest-junit mongodb-memory-server
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
                                    # Create proper Jest config
                                    cat > jest.config.js << 'EOL'
                                    module.exports = {
                                        testResultsProcessor: 'jest-junit',
                                        reporters: [
                                            'default',
                                            ['jest-junit', {
                                                outputDirectory: 'test-results',
                                                outputName: 'junit.xml'
                                            }]
                                        ],
                                        collectCoverage: true,
                                        coverageReporters: ['lcov', 'text'],
                                        coverageDirectory: 'coverage',
                                        testEnvironment: 'jsdom',
                                        setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
                                        moduleNameMapper: {
                                            '^react-router-dom$': '<rootDir>/node_modules/react-router-dom',
                                            '^@/(.*)$': '<rootDir>/src/$1'
                                        }
                                    };
                                    EOL
                                    
                                    # Run tests with CI configuration
                                    CI=true npm run test:ci || true
                                '''
                            }
                        }
                    }
                    post {
                        always {
                            junit 'frontend/test-results/junit.xml'
                            archiveArtifacts artifacts: 'frontend/coverage/**/*'
                        }
                    }
                }
                stage('Backend Tests') {
                    steps {
                        container('nodejs') {
                            dir('backend') {
                                sh '''
                                    # Create MongoDB memory server setup
                                    cat > jest.setup.js << 'EOL'
                                    const { MongoMemoryServer } = require('mongodb-memory-server');
                                    const mongoose = require('mongoose');
                                    
                                    let mongoServer;
                                    
                                    module.exports = async () => {
                                        mongoServer = await MongoMemoryServer.create();
                                        process.env.MONGO_URI = mongoServer.getUri();
                                        await mongoose.connect(process.env.MONGO_URI, {
                                            useNewUrlParser: true,
                                            useUnifiedTopology: true,
                                        });
                                    };
                                    
                                    module.exports.teardown = async () => {
                                        await mongoose.disconnect();
                                        if (mongoServer) await mongoServer.stop();
                                    };
                                    EOL
                                    
                                    # Create Jest config
                                    cat > jest.config.js << 'EOL'
                                    module.exports = {
                                        testResultsProcessor: 'jest-junit',
                                        reporters: [
                                            'default',
                                            ['jest-junit', {
                                                outputDirectory: 'test-results',
                                                outputName: 'junit.xml'
                                            }]
                                        ],
                                        collectCoverage: true,
                                        coverageReporters: ['lcov', 'text'],
                                        coverageDirectory: 'coverage',
                                        testEnvironment: 'node',
                                        globalSetup: '<rootDir>/jest.setup.js',
                                        setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
                                    };
                                    EOL
                                    
                                    # Run tests with CI configuration
                                    npm run test:ci || true
                                '''
                            }
                        }
                    }
                    post {
                        always {
                            junit 'backend/test-results/junit.xml'
                            archiveArtifacts artifacts: 'backend/coverage/**/*'
                        }
                    }
                }
            }
        }

        stage('Build & Push') {
            when {
                expression { currentBuild.result == null || currentBuild.result == 'SUCCESS' }
            }
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
            archiveArtifacts artifacts: '**/coverage/**/*,**/test-results/**/*'
            cleanWs()
        }
        failure {
            script {
                echo "Build failed - ${BUILD_URL}"
            }
        }
        success {
            script {
                echo "Build succeeded - ${BUILD_URL}"
            }
        }
    }
}