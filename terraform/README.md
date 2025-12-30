# Terraform Deployment Guide

This guide outlines the steps to deploy your containerized Storycraft application to Google Cloud Run using **Terraform**, integrating with a pre-configured Google OAuth client.

### Prerequisites

- **Google Cloud Project:** An active Google Cloud project with billing enabled.
- **Source Code:** You must clone the repository to your environment.

---

## Step 1: Initial Setup in Cloud Shell

Execute the following steps directly in the **Google Cloud Console's Cloud Shell** environment, as it comes pre-configured with `gcloud`, `terraform`, and `git`.

1.  **Launch Cloud Shell** from the Google Cloud Console.
2.  **Clone the Repository:**
    ```bash
    git clone https://github.com/mblanc/storycraft.git
    cd storycraft/terraform
    ```

---

## Step 2: Manual Google Cloud OAuth Setup (Required One-Time Setup)

Configure the Oauth Consent screen

1.  **Access the Google Cloud Console.**
2.  **Configure the OAuth Consent Screen:** Navigate to **APIs & Services** $\rightarrow$ **OAuth consent screen**.
    - Click **Get Started**
    - Choose an App Name : e.g. "Storycraft"
    - Choose a User support email : e.g. Google project's admin email
    - Audience : Internal
    - Contact Information : enter the addresses are Google will notify about any changes to the project.
    - Check 'I agree to the Google API Services: User Data Policy.'
    - Click on **Continue**
    - Click on **Create**

Create the Web Application client ID _before_ running Terraform.

1.  **Access the Google Cloud Console.**
2.  **Create OAuth Client:** Navigate to **APIs & Services** $\rightarrow$ **Credentials**.
    - Click **+ CREATE CREDENTIALS**, and select **OAuth client ID**.
    - For **Application type**, choose **Web application**.
    - Give it a distinct name (e.g., `Storycraft Web Client`).
    - **Leave the Authorized redirect URIs blank for now.**
    - Click **CREATE**.
3.  **Save Credentials:** A pop-up will display your **Client ID** and **Client Secret**. **Save these two values immediately.**

---

## Step 3: Configure Terraform Variables

While in the `storycraft/terraform` directory, edit the **`terraform.tfvars`** file and provide the required values.

```hcl
# terraform.tfvars

# --- REQUIRED GCP CONFIGURATION ---
project_id = "your-gcp-project-id"   # The Google Cloud Project ID
region     = "us-central1"           # The region for Cloud Run and Artifact Registry

# --- REQUIRED OAUTH CREDENTIALS (from Step 2) ---
oauth_client_id     = "YOUR_CLIENT_ID_FROM_GCP_CONSOLE"
oauth_client_secret = "YOUR_CLIENT_SECRET_FROM_GCP_CONSOLE"
```

## Step 4: Run Terraform Deployment

Execute the standard Terraform workflow commands.

```bash
terraform init
terraform plan
terraform apply --auto-approve
```

---

## Step 5: Finalize OAuth Redirect URI

1.  **Get the Redirect URL:** After `terraform apply` completes, locate the **`redirect_url`** output value:

    ```bash
    terraform output service_url
    terraform output redirect_url
    ```

    (Example output: `https://storycraft-123456789.us-central1.run.app`
    `https://storycraft-123456789.us-central1.run.app/api/auth/callback/google`)

2.  **Register Authorized Javascript Origins** Go back to the **Google Cloud Console** $\rightarrow$ **APIs & Services** $\rightarrow$ **Credentials**.
    - Click the name of your OAuth 2.0 Client ID (e.g., `Storycraft Web Client`).
    - Under **uthorized Javascript Origins**, click **ADD URI**.
    - **Paste the exact URL obtained from the `terraform output service_url` command.**
    - Click **SAVE**.

3.  **Register the URI:** Go back to the **Google Cloud Console** $\rightarrow$ **APIs & Services** $\rightarrow$ **Credentials**.
    - Click the name of your OAuth 2.0 Client ID (e.g., `Storycraft Web Client`).
    - Under **Authorized redirect URIs**, click **ADD URI**.
    - **Paste the exact URL obtained from the `terraform output redirect_url` command.**
    - Click **SAVE**.

---

## Step 6: Access the Application

Once the redirect URI is saved in the console, your application is fully configured.

Use the **`service_url`** output to access your application:

```bash
terraform output service_url
```

---
