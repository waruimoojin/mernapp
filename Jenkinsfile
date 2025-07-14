pipeline {
  agent any
  stages {
    stage('List credentials') {
      steps {
        script {
          // Liste les credentials (seulement IDs visibles dans ce contexte)
          def creds = com.cloudbees.plugins.credentials.CredentialsProvider.lookupCredentials(
            com.cloudbees.plugins.credentials.common.StandardCredentials.class,
            Jenkins.instance,
            null,
            null)
          creds.each { c ->
            echo "Credential: ${c.id} - ${c.class}"
          }
        }
      }
    }
  }
}
