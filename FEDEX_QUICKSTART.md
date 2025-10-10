# FedEx API Quick Start Guide

## ✅ Your Test Credentials (From Screenshot)

```
API Key (Client ID):     l7d41d77003fcd49f2801c3b9de7e5bdf9
Secret Key:              279d385a5dd9446fa53c37bbd685340f
Account Number:          740561073
Environment:             TEST/SANDBOX (Global)
```

## 📋 Step-by-Step Setup

### 1. Add to .env File

Open `.env` and add these lines at the bottom:

```env
# FedEx API Configuration (TEST/SANDBOX)
FEDEX_API_URL=https://apis-sandbox.fedex.com
FEDEX_CLIENT_ID=l7d41d77003fcd49f2801c3b9de7e5bdf9
FEDEX_CLIENT_SECRET=279d385a5dd9446fa53c37bbd685340f
FEDEX_ACCOUNT_NUMBER=740561073
```

### 2. Test the Configuration

Run the test script:
```bash
node test-fedex-api.js
```

This will:
- ✅ Check if credentials are configured
- ✅ Test OAuth authentication
- ✅ Test tracking with FedEx test tracking number
- ✅ Show sample tracking data

### 3. Restart Your Application

```bash
node app.js
```

### 4. Test in Your Dashboard

1. Go to a Purchase Order with a FedEx tracking number
2. Click the tracking number to open modal
3. You should see "🔄 Refresh from FedEx API" button
4. Click it to fetch live tracking data

## 🧪 Test Tracking Numbers

FedEx provides these test tracking numbers for sandbox:

- `449044304137821` - Standard test shipment
- `568838414941` - Delivered package
- `61299998820821829` - In transit

Use these to test the integration without real packages.

## 🔄 Switching to Production

When ready for real tracking:

1. Get production credentials from FedEx Developer Portal
2. Update your `.env` file:

```env
FEDEX_API_URL=https://apis.fedex.com
FEDEX_CLIENT_ID=your_production_client_id
FEDEX_CLIENT_SECRET=your_production_secret
FEDEX_ACCOUNT_NUMBER=740561073
```

3. Restart application

## 🎯 What You'll Get

With FedEx API enabled, you get:

✅ **Real-time tracking status** - Direct from FedEx servers
✅ **Complete tracking history** - Full timeline of package movement
✅ **Delivery estimates** - Accurate delivery dates
✅ **Auto-updates** - Database automatically updated with latest info
✅ **In-app tracking** - No need to leave your dashboard

## 🆘 Troubleshooting

### "Authentication failed"
- Verify credentials are copied correctly (no extra spaces)
- Check API URL matches environment (sandbox vs production)
- Ensure FedEx account is active

### "No tracking information found"
- Using test credentials? Use FedEx test tracking numbers
- Using production? Use real FedEx tracking numbers
- Verify tracking number format is correct

### "API not configured"
- Check .env file exists and has credentials
- Restart application after adding credentials
- Run test script to verify setup

## 📞 Support

- FedEx Developer Portal: https://developer.fedex.com/
- API Documentation: https://developer.fedex.com/api/en-us/catalog.html
- Your test credentials expire: Check developer portal for expiry date

---

**Current Status**: TEST/SANDBOX Environment ✅
**Ready for**: Development and Testing
**Next Step**: Run `node test-fedex-api.js`
