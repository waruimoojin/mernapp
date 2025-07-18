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
                                // Create jest.config.js using echo commands
                                sh '''
                                    echo "module.exports = {" > jest.config.js
                                    echo "  testResultsProcessor: 'jest-junit'," >> jest.config.js
                                    echo "  reporters: [" >> jest.config.js
                                    echo "    'default'," >> jest.config.js
                                    echo "    ['jest-junit', {" >> jest.config.js
                                    echo "      outputDirectory: 'test-results'," >> jest.config.js
                                    echo "      outputName: 'junit.xml'" >> jest.config.js
                                    echo "    }]" >> jest.config.js
                                    echo "  ]," >> jest.config.js
                                    echo "  collectCoverage: true," >> jest.config.js
                                    echo "  coverageReporters: ['lcov', 'text']," >> jest.config.js
                                    echo "  coverageDirectory: 'coverage'" >> jest.config.js
                                    echo "};" >> jest.config.js
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
                                    npm install --save-dev jest supertest jest-junit
                                    npm install --save-dev mongodb-memory-server
                                '''
                                // Create jest.config.js using echo commands
                                sh '''
                                    echo "module.exports = {" > jest.config.js
                                    echo "  testResultsProcessor: 'jest-junit'," >> jest.config.js
                                    echo "  reporters: [" >> jest.config.js
                                    echo "    'default'," >> jest.config.js
                                    echo "    ['jest-junit', {" >> jest.config.js
                                    echo "      outputDirectory: 'test-results'," >> jest.config.js
                                    echo "      outputName: 'junit.xml'" >> jest.config.js
                                    echo "    }]" >> jest.config.js
                                    echo "  ]," >> jest.config.js
                                    echo "  collectCoverage: true," >> jest.config.js
                                    echo "  coverageReporters: ['lcov', 'text']," >> jest.config.js
                                    echo "  coverageDirectory: 'coverage'" >> jest.config.js
                                    echo "};" >> jest.config.js
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
                        moduleNameMapper: {
                            '^react-router-dom$': '<rootDir>/node_modules/react-router-dom',
                            '^@/(.*)$': '<rootDir>/src/$1'
                        },
                        testEnvironment: 'jsdom',
                        setupFilesAfterEnv: ['<rootDir>/src/setupTests.js']
                    };
                    EOL
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
                    # Create test environment file
                    echo "MONGO_URI=mongodb://localhost:27017/testdb" > .env.test
                    echo "PORT=5001" >> .env.test
                    
                    # Create jest config
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
                        globalTeardown: '<rootDir>/jest.teardown.js',
                        setupFilesAfterEnv: ['<rootDir>/jest.setupAfterEnv.js']
                    };
                    EOL
                    
                    # Create setup files
                    cat > jest.setup.js << 'EOL'
                    const dotenv = require('dotenv');
                    dotenv.config({ path: '.env.test' });
                    EOL
                    
                    cat > jest.teardown.js << 'EOL'
                    const mongoose = require('mongoose');
                    module.exports = async () => {
                        await mongoose.disconnect();
                    };
                    EOL
                    
                    cat > jest.setupAfterEnv.js << 'EOL'
                    // Additional setup if needed
                    EOL
                    
                    mkdir -p test-results
                    NODE_ENV=test npm test -- --ci --coverage --detectOpenHandles
                '''
                            }
                        }
                    }
                    post {
                        always {
                              junit 'backend/test-results/junit.xml'
                                archiveArtifacts artifacts: 'backend/coverage/**/*,backend/test-results/**/*'
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
                // Uncomment to add Slack notifications
                // slackSend color: 'danger', message: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER} (${env.BUILD_URL})"
            }
        }
        success {
            script {
                echo "Build succeeded - ${BUILD_URL}"
                // Uncomment to add Slack notifications
                // slackSend color: 'good', message: "Build Succeeded: ${env.JOB_NAME} #${env.BUILD_NUMBER} (${env.BUILD_URL})"
            }
        }
    }
}