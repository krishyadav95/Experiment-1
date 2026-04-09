//create supabase client

const supabaseUrl = https://tyyflyitcpsuqhbnvyjv.supabase.co
const supabaseKey = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5eWZseWl0Y3BzdXFoYm52eWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjkxMDcsImV4cCI6MjA5MTI0NTEwN30.4rTwXx7iDAKs8IX9lL9StlQ_qXbqY8oRr1ktUusJsGo

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey)

// Create signup function 
async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
    })

    if (error) {
        alert(error.message)
    } else {
        alert("Signup successful")
        return data.user
    }
}

//create signup function
async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
    })

    if (error) {
        alert(error.message)
    } else {
        alert("Signup successful")
        return data.user
    }
}

//save user data

async function saveUser(user, name, goal) {
    const { error } = await supabase.from('profiles').insert([
        {
            id: user.id,
            email: user.email,
            name: name,
            goal: goal
        }
    ])

    if (error) {
        console.log(error)
    }
}

//connect everything
async function handleSignup() {
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value
    const name = document.getElementById("name").value
    const goal = document.getElementById("goal").value

    const user = await signUp(email, password)

    if (user) {
        await saveUser(user, name, goal)
    }
}