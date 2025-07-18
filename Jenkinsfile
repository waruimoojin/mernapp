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
                                    npm install react-router-dom --save
                                    npm install --save-dev \
                                    @testing-library/react \
                                    @testing-library/jest-dom \
                                    jest \
                                    babel-jest \
                                    @babel/preset-env \
                                    @babel/preset-react \
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
                                    npm install --save-dev \
                                    jest \
                                    supertest \
                                    jest-junit \
                                    mongodb-memory-server \
                                    mongoose
                                    # Verify installations
                                    npm list jest supertest mongodb-memory-server mongoose
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
                            # Install react-router-dom as production dependency
                            npm install react-router-dom --save
                            CI=true npm test -- --coverage
                        '''
                        junit 'junit.xml'
                        archiveArtifacts artifacts: 'coverage/**'
                    }
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
                            
                            # Create jest.setup.js if it doesn't exist
                            if [ ! -f tests/jest.setup.js ]; then
                                cat > tests/jest.setup.js << 'EOF'
                                const { MongoMemoryServer } = require('mongodb-memory-server');
                                let mongoServer;
                                
                                module.exports.setup = async () => {
                                    mongoServer = await MongoMemoryServer.create();
                                    const mongoUri = mongoServer.getUri();
                                    process.env.MONGO_URI = mongoUri;
                                    return mongoUri;
                                };
                                
                                module.exports.teardown = async () => {
                                    if (mongoServer) {
                                        await mongoServer.stop();
                                    }
                                };
                                EOF
                            fi
                            
                            # Run tests with proper setup
                            npm test -- --coverage --testPathPattern=tests
                        '''
                        junit 'test-results/junit.xml'
                        archiveArtifacts artifacts: 'coverage/**'
                    }
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