const errorMap: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha inválidos. Verifique os dados e tente novamente.',
  'User already registered': 'Este e-mail já está cadastrado no sistema.',
  'Password is too short': 'A senha deve ter pelo menos 6 caracteres.',
  'Email not confirmed': 'O e-mail ainda não foi confirmado. Verifique sua caixa de entrada.',
  'Signup is disabled': 'O cadastro de novos usuários está temporariamente desativado.',
  'Database error saving profile': 'Erro ao salvar o perfil. Verifique sua conexão.',
  'User not found': 'Usuário não encontrado.',
  'Check your email for the confirmation link': 'Um link de confirmação foi enviado para seu e-mail.',
  'Email rate limit exceeded': 'Muitas tentativas em pouco tempo. Tente novamente mais tarde.',
  'Network request failed': 'Erro de rede. Verifique seu Wi-Fi/Internet.',
  'Invalid email': 'O e-mail inserido é inválido.',
  'User not logged in': 'Sua sessão expirou. Faça login novamente.',
  'Function not found': 'Erro interno do servidor. Reporte ao suporte.',
  'Permission denied': 'Você não tem permissão para realizar esta ação.',
  'not_found': 'Recurso não encontrado no servidor.',
  'Field required': 'Preencha todos os campos obrigatórios.',
};

/**
 * Traduz mensagens de erro técnicas do Supabase/Back para Português amigável.
 * @param error 
 * @returns 
 */
export function translateError(error: any): string {
  if (!error) return 'Ocorreu um erro inesperado.';
  
  const originalMessage = typeof error === 'string' ? error : (error.message || error.error_description || '');
  
  // Busca exata
  if (errorMap[originalMessage]) {
    return errorMap[originalMessage];
  }

  // Busca por palavra-chave se for erro complexo
  for (const [key, translation] of Object.entries(errorMap)) {
    if (originalMessage.toLowerCase().includes(key.toLowerCase())) {
      return translation;
    }
  }

  // Traduções específicas de validação do Forms
  if (originalMessage.includes('password') && originalMessage.includes('weak')) {
    return 'A senha fornecida é muito fraca. Tente uma mais forte.';
  }
  
  if (originalMessage.includes('null value in column "password"')) {
    return 'A senha é obrigatória para criar o acesso ao portal.';
  }

  if (originalMessage.includes('duplicate key value')) {
    return 'Já existe um registro com estes dados no sistema.';
  }

  return originalMessage || 'Desculpe, ocorreu um erro desconhecido no processamento.';
}
