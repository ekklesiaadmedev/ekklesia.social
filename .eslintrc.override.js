module.exports = {
  rules: {
    // Permitir exportação de hooks e utilitários em arquivos de componentes UI
    'react-refresh/only-export-components': [
      'warn',
      {
        allowConstantExport: true,
        allowExportNames: [
          // Hooks personalizados
          'useFormField',
          'useSidebar',
          
          // Variantes e utilitários de estilo
          'buttonVariants',
          'toggleVariants',
          'navigationMenuTriggerStyle',
          
          // Contextos
          'AuthContext',
          'QueueContext'
        ]
      }
    ]
  }
};