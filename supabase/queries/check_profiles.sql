SELECT p.id, p.name, p.phone, p.city, p.state, p.birth_date,
  CASE WHEN mac.id IS NOT NULL THEN 'CONCLUÍDA' ELSE 'PENDENTE' END as missao_status,
  CASE WHEN (p.name IS NOT NULL AND p.name != ''
         AND p.phone IS NOT NULL AND p.phone != ''
         AND p.city IS NOT NULL AND p.city != ''
         AND p.state IS NOT NULL AND p.state != ''
         AND p.birth_date IS NOT NULL) THEN 'COMPLETO' ELSE 'INCOMPLETO' END as perfil_status
FROM profiles p
LEFT JOIN missoes_automaticas_concluidas mac ON mac.user_id = p.id AND mac.missao_tipo = 'completar_perfil'
WHERE p.email IS NOT NULL
ORDER BY p.name
LIMIT 20;
