pipeline {
    agent any

    stages {
        stage('Test Secret Text Credential') {
            steps {
                withCredentials([string(credentialsId: 'sonarqube-token', variable: 'MY_SECRET')]) {
                    script {
                        echo "Le secret récupéré est : ${MY_SECRET.take(4)}****"
                        // Affiche juste les 4 premiers caractères pour tester sans tout dévoiler
                    }
                }
            }
        }
    }
}
