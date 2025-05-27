# test-api.ps1

# Function to make API calls
function Test-API {
    param (
        [string]$Uri,
        [string]$Method,
        [object]$Body,
        [string]$Token
    )

    $headers = @{
        "Content-Type" = "application/json"
    }

    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    try {
        if ($Body) {
            $bodyJson = $Body | ConvertTo-Json
            Write-Host "Making $Method request to $Uri with token: $(if ($Token) { 'Present' } else { 'Not Present' })"
            $response = Invoke-RestMethod -Uri $Uri -Method $Method -Headers $headers -Body $bodyJson
        } else {
            Write-Host "Making $Method request to $Uri with token: $(if ($Token) { 'Present' } else { 'Not Present' })"
            $response = Invoke-RestMethod -Uri $Uri -Method $Method -Headers $headers
        }
        Write-Host "Success: $($response | ConvertTo-Json)"
        return $response
    }
    catch {
        Write-Host "Error: $_"
        Write-Host "Request details:"
        Write-Host "URL: $Uri"
        Write-Host "Method: $Method"
        Write-Host "Headers: $($headers | ConvertTo-Json)"
        if ($Body) {
            Write-Host "Body: $($Body | ConvertTo-Json)"
        }
        return $null
    }
}

# Test API endpoints
$baseUrl = "http://localhost:3000/api"
$token = ""

Write-Host "`nTesting Authentication..."

# Test signup (which now includes signin)
$signupBody = @{
    email = "testsdcbwscxsdvdvsdfsdgdeweftxdv@example.com"
    password = "testsxcbdwesdvsdvsdgsdgsdvfwefsdfpassword123"
    action = "signup"
}

try {
    $signupResponse = Test-API -Uri "$baseUrl/auth" -Method Post -Body $signupBody
    if ($signupResponse) {
        Write-Host "Signup and signin successful"
        $token = $signupResponse.access_token
        Write-Host "Token received: $token"
    }
} catch {
    Write-Host "Error: $_"
    exit
}

if (-not $token) {
    Write-Host "Failed to get authentication token. Exiting..."
    exit
}

Write-Host "`nTesting Tasks..."

# Test creating a task
$taskBody = @{
    title = "Test Task"
    description = "This is a test task"
    due_date = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
    priority = "medium"
    status = "pending"
}

try {
    $taskResponse = Test-API -Uri "$baseUrl/tasks" -Method Post -Body $taskBody -Token $token
    if ($taskResponse) {
        $taskId = $taskResponse.id
        Write-Host "Task created with ID: $taskId"
    }
} catch {
    Write-Host "Error: $_"
}

# Test getting tasks
try {
    $tasksResponse = Test-API -Uri "$baseUrl/tasks" -Method Get -Token $token
    if ($tasksResponse) {
        Write-Host "`nTasks retrieved successfully"
    }
} catch {
    Write-Host "Error: $_"
}

Write-Host "`nTesting Profile..."

# Test getting profile
try {
    $profileResponse = Test-API -Uri "$baseUrl/profile" -Method Get -Token $token
    if ($profileResponse) {
        Write-Host "Profile retrieved successfully"
    }
} catch {
    Write-Host "Error: $_"
}

# Test updating profile
$profileBody = @{
    full_name = "Test User"
    avatar_url = "https://example.com/avatar.jpg"
    preferences = @{
        theme = "dark"
        notifications = $true
    }
}

try {
    $updateProfileResponse = Test-API -Uri "$baseUrl/profile" -Method Put -Body $profileBody -Token $token
    if ($updateProfileResponse) {
        Write-Host "Profile updated successfully"
    }
} catch {
    Write-Host "Error: $_"
}

Write-Host "`nTesting Task Operations..."

# Test updating a task
$updateTaskBody = @{
    title = "Updated Test Task"
    description = "This is an updated test task"
    due_date = (Get-Date).AddDays(14).ToString("yyyy-MM-dd")
    priority = "high"
    status = "in_progress"
}

try {
    $updateTaskResponse = Test-API -Uri "$baseUrl/tasks/$taskId" -Method Put -Body $updateTaskBody -Token $token
    if ($updateTaskResponse) {
        Write-Host "Task updated successfully"
    }
} catch {
    Write-Host "Error: $_"
}

# Test deleting a task
try {
    $deleteTaskResponse = Test-API -Uri "$baseUrl/tasks/$taskId" -Method Delete -Token $token
    if ($deleteTaskResponse) {
        Write-Host "Task deleted successfully"
    }
} catch {
    Write-Host "Error: $_"
}

Write-Host "`nTesting Sign Out..."

# Test sign out
try {
    $signoutResponse = Test-API -Uri "$baseUrl/auth" -Method Delete -Token $token
    if ($signoutResponse) {
        Write-Host "Signed out successfully"
    }
} catch {
    Write-Host "Error: $_"
}