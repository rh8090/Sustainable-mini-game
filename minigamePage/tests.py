from django.test import TestCase

# Create your tests here.
class testMinigamePage(TestCase):
    def test_valid_minigame(self):
        response = self.client.get('/minigame/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "canvas")