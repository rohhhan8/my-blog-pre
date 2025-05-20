class CacheControlMiddleware:
    """
    Middleware to add cache control headers to responses.
    This helps improve performance by allowing browsers to cache responses.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Don't cache if the response already has cache headers
        if 'Cache-Control' in response:
            return response
            
        # Don't cache if this is a POST, PUT, PATCH or DELETE request
        if request.method not in ['GET', 'HEAD']:
            response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            return response
            
        # Set different cache times based on the path
        path = request.path_info.strip('/')
        
        # Cache static files longer (1 week)
        if path.startswith('static/'):
            response['Cache-Control'] = 'public, max-age=604800'
        
        # Cache blog list for a short time (5 minutes)
        elif path == 'api/blogs' or path == 'api/blogs/':
            response['Cache-Control'] = 'public, max-age=300'
        
        # Cache individual blog posts longer (1 hour)
        elif path.startswith('api/blogs/') and not (
            path.endswith('/like/') or 
            path.endswith('/view/') or 
            path.endswith('/liked/')
        ):
            response['Cache-Control'] = 'public, max-age=3600'
        
        # Don't cache user-specific data
        elif path.startswith('api/profiles/') or path.startswith('api/users/'):
            response['Cache-Control'] = 'private, max-age=60'
        
        # Default cache policy (10 minutes)
        else:
            response['Cache-Control'] = 'public, max-age=600'
            
        return response
