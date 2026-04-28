// Script para criar as tabelas no Supabase
// Execute: node scripts/setup-database.js

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Credenciais do Supabase (use a service_role key para operações admin)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dmemturmddbbzspvdgoh.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  CONFIGURAÇÃO NECESSÁRIA                                       ║
╠════════════════════════════════════════════════════════════════╣
║  Para executar este script, você precisa da Service Role Key.  ║
║                                                                 ║
║  1. Acesse: https://supabase.com/dashboard/project/dmemturmddbbzspvdgoh/settings/api
║                                                                 ║
║  2. Copie a "service_role" key (em Project API keys)           ║
║                                                                 ║
║  3. Execute o comando com a chave:                             ║
║     set SUPABASE_SERVICE_ROLE_KEY=sua_chave && node scripts/setup-database.js
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝
`)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function runSQL(sql, description) {
  console.log(`⏳ ${description}...`)

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    // Tentar via query direta
    const { error: error2 } = await supabase.from('_exec').select(sql)
    if (error2) {
      console.log(`❌ Erro: ${error.message}`)
      return false
    }
  }

  console.log(`✅ ${description} - OK`)
  return true
}

async function main() {
  console.log('\n🚀 Iniciando configuração do banco de dados Meup Club\n')

  // Ler o arquivo SQL
  const schemaPath = join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql')
  const schema = readFileSync(schemaPath, 'utf8')

  // Dividir em comandos individuais
  const commands = schema
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))

  console.log(`📄 ${commands.length} comandos SQL para executar\n`)

  let success = 0
  let failed = 0

  for (const cmd of commands) {
    try {
      const { error } = await supabase.rpc('exec_sql', { query: cmd + ';' })
      if (error) throw error
      success++
      process.stdout.write('.')
    } catch (err) {
      failed++
      process.stdout.write('x')
    }
  }

  console.log(`\n\n✅ Sucesso: ${success} | ❌ Falhas: ${failed}`)
}

main().catch(console.error)
