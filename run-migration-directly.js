import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://dukpetyemyhszdcnkmug.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1a3BldHllbXloc3pkY25rbXVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3MDU0OSwiZXhwIjoyMDc4OTQ2NTQ5fQ._CV8ER3i64QB7jOHq11KW3Tv38Kfm78Py7np3Xc7ASE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🔧 Running migration directly...\n')

  // Read the migration SQL file
  const migrationSQL = readFileSync('supabase/migrations/20251129104419_add_coach_id_to_client_profiles.sql', 'utf8')

  console.log('📝 Migration SQL:')
  console.log('='.repeat(70))
  console.log(migrationSQL)
  console.log('='.repeat(70))
  console.log('')

  // Split into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Executing ${statements.length} SQL statements...\n`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'
    console.log(`Statement ${i + 1}/${statements.length}:`)
    console.log(statement.substring(0, 100) + '...')

    try {
      // Use rpc to execute raw SQL
      const { data, error } = await supabase.rpc('exec', { sql: statement })

      if (error) {
        // If RPC doesn't work, we need to use a different method
        console.log(`⚠️  Could not execute via RPC: ${error.message}`)
        console.log('Trying alternative method...\n')
        break
      }

      console.log('✅ Success\n')
    } catch (err) {
      console.log(`❌ Error: ${err.message}\n`)
      break
    }
  }

  // Alternative: Use direct REST API
  console.log('🔄 Executing all SQL as one statement via REST API...\n')

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: migrationSQL })
    })

    const result = await response.text()

    if (response.ok || response.status === 404) {
      if (response.status === 404) {
        console.log('⚠️  exec_sql RPC function not found')
        console.log('\n📋 Please run this SQL manually:')
        console.log('1. Go to: https://supabase.com/dashboard/project/dukpetyemyhszdcnkmug/sql/new')
        console.log('2. Paste the SQL from the file: supabase/migrations/20251129104419_add_coach_id_to_client_profiles.sql')
        console.log('3. Click Run\n')
      } else {
        console.log('✅ Migration executed successfully!')
      }
    } else {
      console.log(`❌ Error: ${result}`)
    }
  } catch (error) {
    console.log(`❌ Fetch error: ${error.message}`)
  }

  // Verify the result
  console.log('\n🔍 Verifying migration...')
  const { data: testData, error: testError } = await supabase
    .from('client_profiles')
    .select('coach_id')
    .limit(1)

  if (!testError) {
    console.log('✅ coach_id column exists!')

    // Check if coach was assigned
    const { data: clients } = await supabase
      .from('client_profiles')
      .select('full_name, coach_id')

    if (clients && clients.length > 0) {
      console.log('\n👥 Client coach assignments:')
      clients.forEach(client => {
        console.log(`   - ${client.full_name}: ${client.coach_id ? 'Assigned ✅' : 'Not assigned'}`)
      })
    }

    console.log('\n🎉 Migration complete! Refresh your browser.')
  } else {
    console.log('❌ Column still does not exist')
    console.log('Error:', testError.message)
  }
}

runMigration()
