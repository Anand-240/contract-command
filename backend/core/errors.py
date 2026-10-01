import logging
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)

def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        logger.exception('Unhandled API exception', exc_info=exc)
        return Response({'success': False, 'message': 'Internal server error.', 'errors': {}}, status=500)
    errors = response.data
    if isinstance(errors, dict):
        detail = errors.get('detail') or next(iter(errors.values()), 'Request failed.')
    else:
        detail = errors
    if isinstance(detail, list): detail = detail[0] if detail else 'Request failed.'
    response.data = {'success': False, 'message': str(detail), 'errors': errors}
    return response
