pipeline {
    agent any

    stages {
        stage('Test SSH Credential') {
            steps {
                sshagent(['gitlab-ssh-key']) {
                    // Test de connexion SSH à GitLab
                    sh 'ssh -o StrictHostKeyChecking=no -T git@gitlab.com || true'
                }
            }
        }
    }
}
