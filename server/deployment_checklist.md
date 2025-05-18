# Deployment Checklist

## Environment Variables
- [ ] Set SECRET_KEY
- [ ] Set MONGODB_URI
- [ ] Set DB_NAME
- [ ] Configure Firebase credentials

## Security
- [ ] DEBUG set to False
- [ ] Proper ALLOWED_HOSTS
- [ ] HTTPS configured
- [ ] Secure cookies enabled

## Static/Media Files
- [ ] collectstatic run
- [ ] Static files properly served
- [ ] Media files properly served

## Database
- [ ] Migrations applied
- [ ] Database backup strategy in place

## Monitoring
- [ ] Logging configured
- [ ] Error tracking set up